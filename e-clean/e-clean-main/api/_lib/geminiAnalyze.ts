import { GoogleGenAI } from '@google/genai';

/**
 * Server-only module. Never import this from `src/` — it reads the
 * secret GEMINI_API_KEY from process.env and must never reach the
 * browser bundle.
 */

export interface DetectedComponentJSON {
  id: string;
  name: string;
  confidence: number;
  materials: string[];
  recoveryMethod: string;
  recoveryPotential: 'High' | 'Medium' | 'Low' | 'Possible';
  reason: string;
  box: { x: number; y: number; w: number; h: number };
}

export interface MaterialEntryJSON {
  id: string;
  name: string;
  potential: 'High' | 'Medium' | 'Low' | 'Possible';
  note?: string;
}

export interface RecoveryStepJSON {
  step: number;
  title: string;
  detail: string;
}

export interface GeminiScanResult {
  device: string;
  confidence: number;
  components: DetectedComponentJSON[];
  materials: MaterialEntryJSON[];
  recoveryWorkflow: RecoveryStepJSON[];
  recoveryPotential: {
    score: number;
    componentReuse: number;
    materialRecovery: number;
  };
  disclaimer: string;
}

export class GeminiAnalysisError extends Error {
  statusCode: number;
  publicMessage: string;

  constructor(publicMessage: string, statusCode = 500, cause?: unknown) {
    super(publicMessage);
    this.name = 'GeminiAnalysisError';
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
    if (cause) {
      // Keep the original error around for server-side logs only.
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

const MODEL_NAME = 'gemini-2.5-flash';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    device: { type: 'string' },
    confidence: { type: 'number' },
    components: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          confidence: { type: 'number' },
          materials: { type: 'array', items: { type: 'string' } },
          recoveryMethod: { type: 'string' },
          recoveryPotential: {
            type: 'string',
            enum: ['High', 'Medium', 'Low', 'Possible'],
          },
          reason: { type: 'string' },
          box: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              w: { type: 'number' },
              h: { type: 'number' },
            },
            required: ['x', 'y', 'w', 'h'],
          },
        },
        required: [
          'id',
          'name',
          'confidence',
          'materials',
          'recoveryMethod',
          'recoveryPotential',
          'reason',
          'box',
        ],
      },
    },
    materials: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          potential: {
            type: 'string',
            enum: ['High', 'Medium', 'Low', 'Possible'],
          },
          note: { type: 'string' },
        },
        required: ['id', 'name', 'potential'],
      },
    },
    recoveryWorkflow: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step: { type: 'number' },
          title: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['step', 'title', 'detail'],
      },
    },
    recoveryPotential: {
      type: 'object',
      properties: {
        score: { type: 'number' },
        componentReuse: { type: 'number' },
        materialRecovery: { type: 'number' },
      },
      required: ['score', 'componentReuse', 'materialRecovery'],
    },
    disclaimer: { type: 'string' },
  },
  required: [
    'device',
    'confidence',
    'components',
    'materials',
    'recoveryWorkflow',
    'recoveryPotential',
    'disclaimer',
  ],
} as const;

const PROMPT = `You are an expert electronics and e-waste recovery analyst.

Look carefully at the attached photograph of an electronic device, board, or component and identify ONLY what is visually confirmable in the image.

Rules:
- Identify the overall device/board if you can reasonably tell what it is (e.g. "Arduino UNO", "Mobile phone PCB", "Power supply unit"). If you truly cannot identify the specific device, use a general description (e.g. "Unidentified circuit board").
- List every clearly visible electronic component you can actually see (e.g. PCB, microcontroller/IC, connectors, headers, LEDs, capacitors, resistors, crystal oscillators, transformers, batteries, cables, screws, heatsinks, switches, etc). Only include components a careful human inspector could point to in the photo.
- Do NOT invent or hallucinate components that are not visibly present. If very few components are visible, return only those few — do not pad the list.
- For every component, give a confidence score (0-100) reflecting how certain you are of the identification from the image alone.
- For every component, give a normalized bounding box as PERCENTAGES of the image width and height, where x = left edge, y = top edge, w = width, h = height (all 0-100, x+w <= 100, y+h <= 100). The box must tightly bound the component as it appears in the actual image provided.
- For every component, judge potential reusability based ONLY on its visible physical condition (e.g. no visible corrosion, burn marks, cracks, or damage suggests possible reuse). Do not assume functionality.
- For every component, give a one-sentence "reason" explaining the physical-condition judgment.
- For every component, give a practical recommended recovery/reuse method.
- For every component, list plausible visible material categories (e.g. copper, silicon, plastic, ceramic, steel).
- Provide an overall list of material categories present on the whole board with an aggregate recovery potential and short note.
- Provide a short numbered recovery workflow (4-6 steps) appropriate to what is shown.
- Provide an overall recoveryPotential with a 0-100 "score", plus "componentReuse" and "materialRecovery" as percentages.
- Provide an overall "confidence" (0-100) for the device identification.
- Provide a "disclaimer" string that clearly states a photograph cannot verify electrical functionality and that physical/electrical testing is required before any actual reuse.
- If the image does not show any electronic device or component at all, still return valid JSON with an empty "components" array, a "device" value of "No electronic device detected", low confidence, and an appropriate disclaimer explaining nothing was detected.

Respond with JSON only, matching the provided schema exactly. Do not include markdown formatting or commentary outside the JSON.`;

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

function clampPercent(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(100, v));
}

function normalizeResult(raw: unknown): GeminiScanResult {
  if (!raw || typeof raw !== 'object') {
    throw new GeminiAnalysisError('Gemini returned an unexpected response format.', 502);
  }
  const r = raw as Record<string, unknown>;

  const components = Array.isArray(r.components) ? r.components : [];
  const materials = Array.isArray(r.materials) ? r.materials : [];
  const recoveryWorkflow = Array.isArray(r.recoveryWorkflow) ? r.recoveryWorkflow : [];
  const recoveryPotentialRaw =
    r.recoveryPotential && typeof r.recoveryPotential === 'object'
      ? (r.recoveryPotential as Record<string, unknown>)
      : {};

  return {
    device: typeof r.device === 'string' && r.device.trim() ? r.device : 'Unidentified device',
    confidence: clampPercent(r.confidence),
    components: components.map((c, idx) => {
      const comp = (c ?? {}) as Record<string, unknown>;
      const box = (comp.box ?? {}) as Record<string, unknown>;
      const potential = comp.recoveryPotential;
      const validPotential =
        potential === 'High' || potential === 'Medium' || potential === 'Low' || potential === 'Possible'
          ? potential
          : 'Possible';
      return {
        id: typeof comp.id === 'string' && comp.id ? comp.id : `component-${idx + 1}`,
        name: typeof comp.name === 'string' && comp.name ? comp.name : `Component ${idx + 1}`,
        confidence: clampPercent(comp.confidence),
        materials: Array.isArray(comp.materials) ? comp.materials.filter((m): m is string => typeof m === 'string') : [],
        recoveryMethod: typeof comp.recoveryMethod === 'string' ? comp.recoveryMethod : 'Inspect and sort manually before recycling.',
        recoveryPotential: validPotential,
        reason: typeof comp.reason === 'string' ? comp.reason : 'Visual condition could not be fully assessed.',
        box: {
          x: clampPercent(box.x),
          y: clampPercent(box.y),
          w: clampPercent(box.w),
          h: clampPercent(box.h),
        },
      };
    }),
    materials: materials.map((m, idx) => {
      const mat = (m ?? {}) as Record<string, unknown>;
      const potential = mat.potential;
      const validPotential =
        potential === 'High' || potential === 'Medium' || potential === 'Low' || potential === 'Possible'
          ? potential
          : 'Possible';
      return {
        id: typeof mat.id === 'string' && mat.id ? mat.id : `material-${idx + 1}`,
        name: typeof mat.name === 'string' && mat.name ? mat.name : `Material ${idx + 1}`,
        potential: validPotential,
        note: typeof mat.note === 'string' ? mat.note : undefined,
      };
    }),
    recoveryWorkflow: recoveryWorkflow.map((s, idx) => {
      const step = (s ?? {}) as Record<string, unknown>;
      return {
        step: typeof step.step === 'number' ? step.step : idx + 1,
        title: typeof step.title === 'string' && step.title ? step.title : `Step ${idx + 1}`,
        detail: typeof step.detail === 'string' ? step.detail : '',
      };
    }),
    recoveryPotential: {
      score: clampPercent(recoveryPotentialRaw.score),
      componentReuse: clampPercent(recoveryPotentialRaw.componentReuse),
      materialRecovery: clampPercent(recoveryPotentialRaw.materialRecovery),
    },
    disclaimer:
      typeof r.disclaimer === 'string' && r.disclaimer
        ? r.disclaimer
        : 'A photograph cannot verify electrical functionality. Physical and electrical testing is required before reusing any component.',
  };
}

export async function analyzeImageWithGemini(
  base64Image: string,
  mimeType: string
): Promise<GeminiScanResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new GeminiAnalysisError(
      'The server is missing a GEMINI_API_KEY. Add it to your .env file and restart the dev server.',
      500
    );
  }

  if (!base64Image || typeof base64Image !== 'string') {
    throw new GeminiAnalysisError('No image was provided to analyze.', 400);
  }

  const cleanMimeType = mimeType && typeof mimeType === 'string' ? mimeType : 'image/jpeg';
  const approxBytes = (base64Image.length * 3) / 4;
  const MAX_BYTES = 12 * 1024 * 1024; // 12 MB safety cap
  if (approxBytes > MAX_BYTES) {
    throw new GeminiAnalysisError('The captured image is too large to analyze. Please try again.', 413);
  }

  const ai = new GoogleGenAI({ apiKey });

  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: 'user',
          parts: [
            { text: PROMPT },
            {
              inlineData: {
                mimeType: cleanMimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        // Standard (lowercase-typed) JSON Schema — the modern
        // `responseJsonSchema` field, as opposed to the older
        // `responseSchema` field which requires the uppercase `Type` enum.
        responseJsonSchema: RESPONSE_SCHEMA,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (/api key not valid|invalid.*api key|permission denied/i.test(message)) {
      throw new GeminiAnalysisError('The Gemini API key is invalid. Please check your .env file.', 401, err);
    }
    if (/quota|rate limit|resource_exhausted/i.test(message)) {
      throw new GeminiAnalysisError('The Gemini API rate limit or quota was exceeded. Please try again shortly.', 429, err);
    }
    if (/safety|blocked/i.test(message)) {
      throw new GeminiAnalysisError('The image could not be analyzed because it was flagged by Gemini safety filters.', 422, err);
    }
    throw new GeminiAnalysisError('Could not reach the Gemini API. Please try again.', 502, err);
  }

  const text = response.text;

  if (!text) {
    throw new GeminiAnalysisError('Gemini did not return any analysis for this image.', 502);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch (err) {
    throw new GeminiAnalysisError('Gemini returned a response that could not be parsed.', 502, err);
  }

  return normalizeResult(parsed);
}
