import Groq from 'groq-sdk';

/**
 * Server-only AI analysis module.
 *
 * IMPORTANT:
 * - This file must NEVER be imported from src/
 * - GROQ_API_KEY must remain server-side
 * - The filename is kept as geminiAnalyze.ts so the existing
 *   analyze-image.ts file does not need to change.
 *
 * AI PROVIDER:
 * Groq
 *
 * MODEL:
 * qwen/qwen3.6-27b
 *
 * Supports:
 * - Text input
 * - Image input
 * - JSON mode
 * - Vision
 *
 * Groq currently lists this model at approximately 500 tokens/sec.
 */

export interface DetectedComponentJSON {
  id: string;
  name: string;
  confidence: number;
  materials: string[];
  recoveryMethod: string;
  recoveryPotential: 'High' | 'Medium' | 'Low' | 'Possible';
  reason: string;

  box: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
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

/**
 * Keep the existing error class name so that
 * api/analyze-image.ts does NOT need to change.
 */
export class GeminiAnalysisError extends Error {
  statusCode: number;
  publicMessage: string;

  constructor(
    publicMessage: string,
    statusCode = 500,
    cause?: unknown
  ) {
    super(publicMessage);

    this.name = 'GeminiAnalysisError';

    this.statusCode = statusCode;

    this.publicMessage = publicMessage;

    if (cause) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

/**
 * Groq model.
 *
 * qwen/qwen3.6-27b:
 * - Vision
 * - Image input
 * - JSON mode
 * - Fast inference
 */
const MODEL_NAME = 'qwen/qwen3.6-27b';

/**
 * Prompt for electronics / e-waste analysis.
 */
const PROMPT = `
You are an expert electronics identification and e-waste recovery analyst.

Analyze the attached photograph carefully.

Your job is to identify electronic devices and components that are
VISUALLY CONFIRMABLE from the image.

IMPORTANT:

DO NOT hallucinate components.

DO NOT assume that a component exists just because it is common
on that type of electronic board.

Only report components that a careful human inspector can actually
see in the supplied image.

==================================================
1. DEVICE IDENTIFICATION
==================================================

Identify the overall electronic device or board.

Examples:

- Arduino UNO
- Raspberry Pi
- ESP32 board
- Mobile phone PCB
- Laptop motherboard
- Power supply board
- Circuit board
- Electronic module
- Sensor board
- Unidentified circuit board

If the exact device cannot be determined, use:

"Unidentified circuit board"

Provide a confidence score from 0 to 100.

==================================================
2. COMPONENT DETECTION
==================================================

Identify clearly visible electronic components.

Possible examples include:

- PCB
- Microcontroller
- IC
- USB connector
- USB port
- Pin headers
- Headers
- LEDs
- Capacitors
- Resistors
- Crystal oscillator
- Diodes
- Transistors
- Voltage regulators
- Connectors
- Switches
- Buttons
- Batteries
- Cables
- Screws
- Heatsinks
- Transformers
- Coils
- Sockets
- Relays
- Sensors

ONLY include components that are actually visible.

If only 3 components are clearly visible,
return only those 3.

Do NOT invent components.

==================================================
3. COMPONENT CONFIDENCE
==================================================

For every detected component provide:

confidence: 0-100

This represents how confident you are that the component
identification is correct based ONLY on the image.

==================================================
4. BOUNDING BOX
==================================================

For every detected component provide a normalized bounding box.

Coordinates must be percentages of the full image.

x = left edge
y = top edge
w = width
h = height

All values must be between 0 and 100.

Constraints:

x + w <= 100

y + h <= 100

The bounding box should tightly surround the visible component.

Example:

{
  "x": 35,
  "y": 20,
  "w": 15,
  "h": 12
}

IMPORTANT:

Do not create huge boxes covering unrelated areas.

==================================================
5. REUSABILITY
==================================================

Estimate potential reuse ONLY from visible physical condition.

Look for:

- Burn marks
- Cracks
- Corrosion
- Broken connectors
- Melted plastic
- Missing components
- Severe scratches
- Physical deformation
- Obvious damage
- Water damage
- Rust

Allowed values:

High
Medium
Low
Possible

IMPORTANT:

A photograph cannot prove that an electronic component actually works.

Never claim:

"Working"

"Fully functional"

"Guaranteed reusable"

Instead use:

"Potentially reusable"

"Requires electrical testing"

==================================================
6. REASON
==================================================

For each component provide a short explanation of the physical
condition visible in the photograph.

Example:

"No visible corrosion or burn damage; electrical testing is still required."

==================================================
7. RECOVERY METHOD
==================================================

Provide a practical recovery or reuse method.

Examples:

- Desolder and electrically test before reuse.
- Separate copper connector contacts.
- Remove and sort the PCB.
- Test USB connector before reuse.
- Separate damaged components.
- Send non-reusable PCB material to certified e-waste recycling.

==================================================
8. MATERIALS
==================================================

Identify plausible material categories.

Examples:

- Copper
- Silicon
- Plastic
- Ceramic
- Steel
- Aluminium
- Fiberglass
- Solder
- Gold plating
- Tin

Do not invent rare materials without reasonable visual or contextual support.

==================================================
9. MATERIAL RECOVERY
==================================================

Return an overall list of material categories present in the device.

For each material provide:

id
name
potential
note

Potential values:

High
Medium
Low
Possible

==================================================
10. RECOVERY WORKFLOW
==================================================

Provide 4-6 practical recovery steps.

Example:

1. Inspect the device for physical damage.
2. Remove batteries and hazardous components.
3. Separate potentially reusable components.
4. Sort material streams.
5. Electrically test reusable components.
6. Send remaining PCB material to certified e-waste recycling.

==================================================
11. RECOVERY SCORE
==================================================

Return:

score: 0-100

componentReuse: 0-100

materialRecovery: 0-100

These values are estimates based on visible condition.

==================================================
12. DISCLAIMER
==================================================

Clearly state:

A photograph cannot verify electrical functionality.
Physical and electrical testing is required before actual reuse.

==================================================
13. NO ELECTRONIC DEVICE
==================================================

If the image does not contain an electronic device or component:

device:
"No electronic device detected"

confidence:
low value

components:
[]

materials:
[]

recoveryWorkflow:
[]

recoveryPotential:
{
  "score": 0,
  "componentReuse": 0,
  "materialRecovery": 0
}

Return a suitable disclaimer.

==================================================
14. OUTPUT FORMAT
==================================================

Return ONLY valid JSON.

Do NOT return markdown.

Do NOT use code fences.

Do NOT write explanations outside the JSON.

The JSON must follow this exact structure:

{
  "device": "Arduino UNO",
  "confidence": 95,

  "components": [
    {
      "id": "microcontroller",
      "name": "ATmega328P Microcontroller",
      "confidence": 94,
      "materials": [
        "silicon",
        "plastic",
        "metal"
      ],
      "recoveryMethod": "Desolder and electrically test before reuse.",
      "recoveryPotential": "High",
      "reason": "No obvious physical damage is visible, but electrical testing is required.",
      "box": {
        "x": 40,
        "y": 35,
        "w": 20,
        "h": 15
      }
    }
  ],

  "materials": [
    {
      "id": "copper",
      "name": "Copper",
      "potential": "High",
      "note": "Present in PCB traces and connectors."
    }
  ],

  "recoveryWorkflow": [
    {
      "step": 1,
      "title": "Inspect",
      "detail": "Inspect the board for visible physical damage."
    },
    {
      "step": 2,
      "title": "Separate",
      "detail": "Separate potentially reusable components."
    },
    {
      "step": 3,
      "title": "Test",
      "detail": "Electrically test components before reuse."
    },
    {
      "step": 4,
      "title": "Recover",
      "detail": "Sort materials for appropriate recovery."
    }
  ],

  "recoveryPotential": {
    "score": 80,
    "componentReuse": 75,
    "materialRecovery": 85
  },

  "disclaimer": "A photograph cannot verify electrical functionality. Physical and electrical testing is required before actual reuse."
}
`;

/**
 * Remove ```json ... ``` if the model returns code fences.
 */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();

  const fenceMatch = trimmed.match(
    /^```(?:json)?\s*([\s\S]*?)\s*```$/i
  );

  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  return trimmed;
}

/**
 * Clamp number to 0-100.
 */
function clampPercent(value: unknown): number {
  const numericValue =
    typeof value === 'number' &&
    Number.isFinite(value)
      ? value
      : 0;

  return Math.max(
    0,
    Math.min(100, numericValue)
  );
}

/**
 * Normalize Gemini/Groq result.
 *
 * This ensures your existing frontend always receives
 * the expected ScanResult-compatible structure.
 */
function normalizeResult(
  raw: unknown
): GeminiScanResult {

  if (
    !raw ||
    typeof raw !== 'object'
  ) {
    throw new GeminiAnalysisError(
      'AI returned an unexpected response format.',
      502
    );
  }

  const result =
    raw as Record<string, unknown>;

  const components =
    Array.isArray(result.components)
      ? result.components
      : [];

  const materials =
    Array.isArray(result.materials)
      ? result.materials
      : [];

  const recoveryWorkflow =
    Array.isArray(result.recoveryWorkflow)
      ? result.recoveryWorkflow
      : [];

  const recoveryPotentialRaw =
    result.recoveryPotential &&
    typeof result.recoveryPotential === 'object'
      ? result.recoveryPotential as Record<string, unknown>
      : {};

  return {
    device:
      typeof result.device === 'string' &&
      result.device.trim()
        ? result.device.trim()
        : 'Unidentified device',

    confidence:
      clampPercent(
        result.confidence
      ),

    components:
      components.map(
        (component, index) => {

          const comp =
            component &&
            typeof component === 'object'
              ? component as Record<string, unknown>
              : {};

          const box =
            comp.box &&
            typeof comp.box === 'object'
              ? comp.box as Record<string, unknown>
              : {};

          const potential =
            comp.recoveryPotential;

          const validPotential =
            potential === 'High' ||
            potential === 'Medium' ||
            potential === 'Low' ||
            potential === 'Possible'
              ? potential
              : 'Possible';

          const componentMaterials =
            Array.isArray(comp.materials)
              ? comp.materials
              : [];

          return {
            id:
              typeof comp.id === 'string' &&
              comp.id.trim()
                ? comp.id.trim()
                : `component-${index + 1}`,

            name:
              typeof comp.name === 'string' &&
              comp.name.trim()
                ? comp.name.trim()
                : `Component ${index + 1}`,

            confidence:
              clampPercent(
                comp.confidence
              ),

            materials:
              componentMaterials.filter(
                (
                  material
                ): material is string =>
                  typeof material === 'string'
              ),

            recoveryMethod:
              typeof comp.recoveryMethod === 'string'
                ? comp.recoveryMethod
                : 'Inspect and electrically test before reuse.',

            recoveryPotential:
              validPotential,

            reason:
              typeof comp.reason === 'string'
                ? comp.reason
                : 'Physical condition could not be fully assessed from the image.',

            box: {
              x: clampPercent(box.x),
              y: clampPercent(box.y),
              w: clampPercent(box.w),
              h: clampPercent(box.h),
            },
          };
        }
      ),

    materials:
      materials.map(
        (material, index) => {

          const mat =
            material &&
            typeof material === 'object'
              ? material as Record<string, unknown>
              : {};

          const potential =
            mat.potential;

          const validPotential =
            potential === 'High' ||
            potential === 'Medium' ||
            potential === 'Low' ||
            potential === 'Possible'
              ? potential
              : 'Possible';

          return {
            id:
              typeof mat.id === 'string' &&
              mat.id.trim()
                ? mat.id.trim()
                : `material-${index + 1}`,

            name:
              typeof mat.name === 'string' &&
              mat.name.trim()
                ? mat.name.trim()
                : `Material ${index + 1}`,

            potential:
              validPotential,

            note:
              typeof mat.note === 'string'
                ? mat.note
                : undefined,
          };
        }
      ),

    recoveryWorkflow:
      recoveryWorkflow.map(
        (workflowStep, index) => {

          const step =
            workflowStep &&
            typeof workflowStep === 'object'
              ? workflowStep as Record<string, unknown>
              : {};

          return {
            step:
              typeof step.step === 'number'
                ? step.step
                : index + 1,

            title:
              typeof step.title === 'string' &&
              step.title.trim()
                ? step.title.trim()
                : `Step ${index + 1}`,

            detail:
              typeof step.detail === 'string'
                ? step.detail
                : '',
          };
        }
      ),

    recoveryPotential: {
      score:
        clampPercent(
          recoveryPotentialRaw.score
        ),

      componentReuse:
        clampPercent(
          recoveryPotentialRaw.componentReuse
        ),

      materialRecovery:
        clampPercent(
          recoveryPotentialRaw.materialRecovery
        ),
    },

    disclaimer:
      typeof result.disclaimer === 'string' &&
      result.disclaimer.trim()
        ? result.disclaimer.trim()
        : 'A photograph cannot verify electrical functionality. Physical and electrical testing is required before actual reuse.',
  };
}

/**
 * Main analysis function.
 *
 * IMPORTANT:
 * The function name is intentionally kept as
 * analyzeImageWithGemini().
 *
 * This means your existing:
 *
 * api/analyze-image.ts
 *
 * does NOT need to change.
 *
 * Internally, this now uses Groq.
 */
export async function analyzeImageWithGemini(
  base64Image: string,
  mimeType: string
): Promise<GeminiScanResult> {

  // =============================================
  // 1. CHECK GROQ API KEY
  // =============================================

  const apiKey =
    process.env.GROQ_API_KEY;

  if (!apiKey) {

    throw new GeminiAnalysisError(
      'The server is missing GROQ_API_KEY. Add GROQ_API_KEY to your .env file and restart the dev server.',
      500
    );
  }

  // =============================================
  // 2. CHECK IMAGE
  // =============================================

  if (
    !base64Image ||
    typeof base64Image !== 'string'
  ) {

    throw new GeminiAnalysisError(
      'No image was provided to analyze.',
      400
    );
  }

  // =============================================
  // 3. VALIDATE MIME TYPE
  // =============================================

  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  const cleanMimeType =
    typeof mimeType === 'string' &&
    allowedMimeTypes.includes(mimeType)
      ? mimeType
      : 'image/jpeg';

  // =============================================
  // 4. IMAGE SIZE
  // =============================================

  const approxBytes =
    (base64Image.length * 3) / 4;

  /*
   * Keep under Groq's documented 20 MB image request
   * limit. We use 12 MB for safety.
   */
  const MAX_BYTES =
    12 * 1024 * 1024;

  if (approxBytes > MAX_BYTES) {

    throw new GeminiAnalysisError(
      'The captured image is too large to analyze. Please try again with a smaller image.',
      413
    );
  }

  // =============================================
  // 5. CREATE GROQ CLIENT
  // =============================================

  const groq =
    new Groq({
      apiKey,
    });

  // =============================================
  // 6. CREATE IMAGE DATA URL
  // =============================================

  const imageDataUrl =
    `data:${cleanMimeType};base64,${base64Image}`;

  // =============================================
  // 7. SEND REQUEST TO GROQ
  // =============================================

  try {

    console.log(
      '=========================================='
    );

    console.log(
      '[Groq] Starting image analysis...'
    );

    console.log(
      '[Groq] Model:',
      MODEL_NAME
    );

    console.log(
      '[Groq] MIME:',
      cleanMimeType
    );

    const completion =
      await groq.chat.completions.create({

        model:
          MODEL_NAME,

        messages: [
          {
            role: 'user',

            content: [
              {
                type: 'text',

                text:
                  PROMPT,
              },

              {
                type: 'image_url',

                image_url: {
                  url:
                    imageDataUrl,
                },
              },
            ],
          },
        ],

        /*
         * JSON Object Mode is supported by
         * Qwen 3.6 Vision.
         *
         * We still validate and normalize the
         * result ourselves below.
         */
        response_format: {
          type: 'json_object',
        },

        /*
         * Low temperature helps keep component
         * identification more deterministic.
         */
        temperature: 0.2,

        /*
         * Keep the response reasonably sized.
         */
        max_completion_tokens: 5000,

        /*
         * Disable unnecessary reasoning for
         * faster visual analysis.
         */
        reasoning_effort: 'none',
      });

    console.log(
      '[Groq] Response received successfully.'
    );

    // =========================================
    // 8. GET RESPONSE TEXT
    // =========================================

    const text =
      completion.choices?.[0]?.message?.content;

    if (
      !text ||
      typeof text !== 'string'
    ) {

      console.error(
        '[Groq] Empty response:',
        completion
      );

      throw new GeminiAnalysisError(
        'Groq did not return any analysis for this image.',
        502
      );
    }

    // =========================================
    // 9. PARSE JSON
    // =========================================

    let parsed: unknown;

    try {

      const cleanedText =
        stripCodeFences(text);

      parsed =
        JSON.parse(cleanedText);

    } catch (parseError) {

      console.error(
        '[Groq] JSON parsing failed.'
      );

      console.error(
        '[Groq] Raw response:',
        text
      );

      throw new GeminiAnalysisError(
        'Groq returned a response that could not be parsed as JSON.',
        502,
        parseError
      );
    }

    // =========================================
    // 10. NORMALIZE RESULT
    // =========================================

    return normalizeResult(
      parsed
    );

  } catch (error) {

    // Already our custom error
    if (
      error instanceof GeminiAnalysisError
    ) {
      throw error;
    }

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      '=========================================='
    );

    console.error(
      '[Groq] API REQUEST FAILED'
    );

    console.error(
      '[Groq] Model:',
      MODEL_NAME
    );

    console.error(
      '[Groq] Error:',
      error
    );

    console.error(
      '[Groq] Message:',
      message
    );

    console.error(
      '=========================================='
    );

    // =========================================
    // AUTHENTICATION ERROR
    // =========================================

    if (
      /invalid.*api key/i.test(message) ||
      /invalid.*authentication/i.test(message) ||
      /authentication/i.test(message) ||
      /unauthorized/i.test(message) ||
      /\b401\b/.test(message)
    ) {

      throw new GeminiAnalysisError(
        'The Groq API key is invalid. Check GROQ_API_KEY in your .env file.',
        401,
        error
      );
    }

    // =========================================
    // RATE LIMIT
    // =========================================

    if (
      /rate.?limit/i.test(message) ||
      /too many requests/i.test(message) ||
      /429/i.test(message) ||
      /quota/i.test(message)
    ) {

      throw new GeminiAnalysisError(
        'Groq rate limit or quota was exceeded. Please try again shortly.',
        429,
        error
      );
    }

    // =========================================
    // MODEL ERROR
    // =========================================

    if (
      /model.*not.*found/i.test(message) ||
      /model.*does not exist/i.test(message) ||
      /invalid.*model/i.test(message) ||
      /\b404\b/.test(message)
    ) {

      throw new GeminiAnalysisError(
        `Groq model "${MODEL_NAME}" was not found or is unavailable. Check the model name and Groq account access.`,
        404,
        error
      );
    }

    // =========================================
    // BAD REQUEST
    // =========================================

    if (
      /bad request/i.test(message) ||
      /\b400\b/.test(message)
    ) {

      throw new GeminiAnalysisError(
        `Groq rejected the image request. Check the image format or request size. ${message}`,
        400,
        error
      );
    }

    // =========================================
    // SERVER / TEMPORARY ERROR
    // =========================================

    if (
      /\b500\b/.test(message) ||
      /\b502\b/.test(message) ||
      /\b503\b/.test(message) ||
      /service unavailable/i.test(message)
    ) {

      throw new GeminiAnalysisError(
        'Groq is temporarily unavailable. Please try scanning again.',
        503,
        error
      );
    }

    // =========================================
    // GENERIC ERROR
    // =========================================

    throw new GeminiAnalysisError(
      `Groq API request failed: ${message}`,
      502,
      error
    );
  }
}