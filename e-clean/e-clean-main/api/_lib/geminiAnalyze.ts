import { GoogleGenAI } from '@google/genai';

/**
 * Server-only Gemini analysis module.
 *
 * IMPORTANT:
 * - Never import this file from src/
 * - GEMINI_API_KEY must stay server-side
 * - Used by the Vite middleware and Vercel API route
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

/*
 * IMPORTANT
 *
 * The previous model:
 *   gemini-2.5-flash
 *
 * was returning 404 for your account.
 *
 * Current model:
 *   gemini-3.8-flash
 */
const MODEL_NAME = 'gemini-3.8-flash';

/**
 * JSON schema returned by Gemini.
 */
const RESPONSE_SCHEMA = {
  type: 'object',

  properties: {
    device: {
      type: 'string',
    },

    confidence: {
      type: 'number',
    },

    components: {
      type: 'array',

      items: {
        type: 'object',

        properties: {
          id: {
            type: 'string',
          },

          name: {
            type: 'string',
          },

          confidence: {
            type: 'number',
          },

          materials: {
            type: 'array',

            items: {
              type: 'string',
            },
          },

          recoveryMethod: {
            type: 'string',
          },

          recoveryPotential: {
            type: 'string',

            enum: [
              'High',
              'Medium',
              'Low',
              'Possible',
            ],
          },

          reason: {
            type: 'string',
          },

          box: {
            type: 'object',

            properties: {
              x: {
                type: 'number',
              },

              y: {
                type: 'number',
              },

              w: {
                type: 'number',
              },

              h: {
                type: 'number',
              },
            },

            required: [
              'x',
              'y',
              'w',
              'h',
            ],
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
          id: {
            type: 'string',
          },

          name: {
            type: 'string',
          },

          potential: {
            type: 'string',

            enum: [
              'High',
              'Medium',
              'Low',
              'Possible',
            ],
          },

          note: {
            type: 'string',
          },
        },

        required: [
          'id',
          'name',
          'potential',
        ],
      },
    },

    recoveryWorkflow: {
      type: 'array',

      items: {
        type: 'object',

        properties: {
          step: {
            type: 'number',
          },

          title: {
            type: 'string',
          },

          detail: {
            type: 'string',
          },
        },

        required: [
          'step',
          'title',
          'detail',
        ],
      },
    },

    recoveryPotential: {
      type: 'object',

      properties: {
        score: {
          type: 'number',
        },

        componentReuse: {
          type: 'number',
        },

        materialRecovery: {
          type: 'number',
        },
      },

      required: [
        'score',
        'componentReuse',
        'materialRecovery',
      ],
    },

    disclaimer: {
      type: 'string',
    },
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

/**
 * Main AI prompt.
 */
const PROMPT = `
You are an expert electronics identification and e-waste recovery analyst.

Analyze the attached photograph carefully.

Your task is to identify electronic devices and components that are
VISUALLY CONFIRMABLE from the image.

IMPORTANT:
Do NOT hallucinate components.
Do NOT assume a component exists simply because it is common on that
type of board.

Only report components that a careful human inspector can actually see.

==================================================
1. DEVICE IDENTIFICATION
==================================================

Identify the overall electronic device or board.

Examples:

- Arduino UNO
- Raspberry Pi
- Mobile phone PCB
- Laptop motherboard
- Power supply board
- Circuit board
- Electronic module
- Unidentified circuit board

If the exact device cannot be determined, use:

"Unidentified circuit board"

Give a confidence score from 0 to 100.

==================================================
2. COMPONENT DETECTION
==================================================

Identify every clearly visible component.

Possible examples:

- PCB
- Microcontroller
- IC
- USB connector
- Pin headers
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

Only include components that are actually visible.

If only 3 components are clearly visible,
return only those 3.

Do NOT invent components.

==================================================
3. CONFIDENCE
==================================================

For every component provide:

confidence: 0-100

This represents how confident you are that the component
identification is correct from the image.

==================================================
4. BOUNDING BOX
==================================================

For every component provide a normalized bounding box.

Coordinates are percentages of the full image.

x = left edge
y = top edge
w = width
h = height

All values must be between 0 and 100.

Constraints:

x + w <= 100
y + h <= 100

The box should tightly surround the visible component.

Example:

{
  "x": 35,
  "y": 20,
  "w": 15,
  "h": 12
}

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

Allowed values:

High
Medium
Low
Possible

IMPORTANT:

A photograph cannot prove that an electronic component works.

Never claim:

"Working"

"Fully functional"

"Guaranteed reusable"

Instead use wording such as:

"Potentially reusable"

"Requires electrical testing"

==================================================
6. REASON
==================================================

For each component provide a short physical-condition explanation.

Example:

"No visible corrosion or burn damage; electrical testing is still required."

==================================================
7. RECOVERY METHOD
==================================================

Provide a practical recovery or reuse method.

Examples:

- Desolder and electrically test before reuse.
- Separate copper connector contacts for material recovery.
- Sort PCB for certified e-waste recycling.
- Test USB connector before reuse.
- Separate damaged components from reusable components.

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

Do not invent rare materials without reasonable visual/contextual support.

==================================================
9. MATERIAL RECOVERY
==================================================

Return an overall list of material categories present.

For each material provide:

id
name
potential
note

Potential:

High
Medium
Low
Possible

==================================================
10. RECOVERY WORKFLOW
==================================================

Provide 4-6 practical recovery steps.

Example:

1. Inspect the device.
2. Remove batteries and hazardous components.
3. Separate potentially reusable components.
4. Sort material streams.
5. Electrically test reusable components.
6. Send remaining material to certified e-waste recycling.

==================================================
11. RECOVERY SCORE
==================================================

Return:

score: 0-100
componentReuse: 0-100
materialRecovery: 0-100

These are estimates based on visible condition.

==================================================
12. DISCLAIMER
==================================================

Clearly state:

A photograph cannot verify electrical functionality.
Physical and electrical testing is required before actual reuse.

==================================================
13. NO DEVICE CASE
==================================================

If there is no electronic device or component visible:

device:
"No electronic device detected"

confidence:
low value

components:
[]

Return valid JSON.

==================================================
FINAL REQUIREMENT
==================================================

Return JSON only.

Do NOT return markdown.

Do NOT use code fences.

Do NOT add explanations outside JSON.
`;

/**
 * Remove markdown JSON fences if Gemini returns them.
 */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();

  const fenceMatch = trimmed.match(
    /^```(?:json)?\s*([\s\S]*?)\s*```$/i
  );

  return fenceMatch
    ? fenceMatch[1].trim()
    : trimmed;
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
 * Normalize Gemini response.
 */
function normalizeResult(
  raw: unknown
): GeminiScanResult {

  if (
    !raw ||
    typeof raw !== 'object'
  ) {
    throw new GeminiAnalysisError(
      'Gemini returned an unexpected response format.',
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
 * Analyze captured image using Gemini.
 */
export async function analyzeImageWithGemini(
  base64Image: string,
  mimeType: string
): Promise<GeminiScanResult> {

  // ---------------------------------------------
  // 1. API KEY
  // ---------------------------------------------

  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new GeminiAnalysisError(
      'The server is missing GEMINI_API_KEY. Add GEMINI_API_KEY to your .env file and restart the dev server.',
      500
    );
  }

  // ---------------------------------------------
  // 2. IMAGE VALIDATION
  // ---------------------------------------------

  if (
    !base64Image ||
    typeof base64Image !== 'string'
  ) {
    throw new GeminiAnalysisError(
      'No image was provided to analyze.',
      400
    );
  }

  // ---------------------------------------------
  // 3. MIME TYPE
  // ---------------------------------------------

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

  // ---------------------------------------------
  // 4. IMAGE SIZE
  // ---------------------------------------------

  const approxBytes =
    (base64Image.length * 3) / 4;

  const MAX_BYTES =
    12 * 1024 * 1024;

  if (approxBytes > MAX_BYTES) {
    throw new GeminiAnalysisError(
      'The captured image is too large to analyze. Please try again with a smaller image.',
      413
    );
  }

  // ---------------------------------------------
  // 5. GEMINI CLIENT
  // ---------------------------------------------

  const ai =
    new GoogleGenAI({
      apiKey,
    });

  // ---------------------------------------------
  // 6. GEMINI REQUEST
  // ---------------------------------------------

  let response;

  try {

    console.log(
      `[Gemini] Starting image analysis with ${MODEL_NAME}...`
    );

    response =
      await ai.models.generateContent({

        model: MODEL_NAME,

        contents: [
          {
            role: 'user',

            parts: [

              {
                text: PROMPT,
              },

              {
                inlineData: {
                  mimeType:
                    cleanMimeType,

                  data:
                    base64Image,
                },
              },

            ],
          },
        ],

        config: {

          responseMimeType:
            'application/json',

          responseJsonSchema:
            RESPONSE_SCHEMA,

          temperature: 0.1,
        },
      });

    console.log(
      '[Gemini] Image analysis completed.'
    );

  } catch (error) {

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      '=========================================='
    );

    console.error(
      '[Gemini] REQUEST FAILED'
    );

    console.error(
      '[Gemini] Model:',
      MODEL_NAME
    );

    console.error(
      '[Gemini] MIME:',
      cleanMimeType
    );

    console.error(
      '[Gemini] Error:',
      error
    );

    console.error(
      '[Gemini] Message:',
      message
    );

    console.error(
      '=========================================='
    );

    // -----------------------------------------
    // INVALID API KEY
    // -----------------------------------------

    if (
      /api key not valid/i.test(message) ||
      /invalid.*api key/i.test(message) ||
      /permission denied/i.test(message) ||
      /\b401\b/.test(message)
    ) {

      throw new GeminiAnalysisError(
        'The Gemini API key is invalid or does not have permission to use Gemini API.',
        401,
        error
      );
    }

    // -----------------------------------------
    // MODEL NOT FOUND
    // -----------------------------------------

    if (
      /\b404\b/.test(message) ||
      /not found/i.test(message) ||
      /does not exist/i.test(message) ||
      /model.*not.*found/i.test(message)
    ) {

      throw new GeminiAnalysisError(
        `Gemini returned 404 for model "${MODEL_NAME}". Check your Gemini API access and @google/genai version. Original error: ${message}`,
        404,
        error
      );
    }

    // -----------------------------------------
    // QUOTA / RATE LIMIT
    // -----------------------------------------

    if (
      /quota/i.test(message) ||
      /rate.?limit/i.test(message) ||
      /resource_exhausted/i.test(message) ||
      /\b429\b/.test(message)
    ) {

      throw new GeminiAnalysisError(
        'Gemini API quota or rate limit was exceeded. Please try again later.',
        429,
        error
      );
    }

    // -----------------------------------------
    // SAFETY
    // -----------------------------------------

    if (
      /safety/i.test(message) ||
      /blocked/i.test(message)
    ) {

      throw new GeminiAnalysisError(
        'Gemini could not analyze this image because it was blocked by safety filters.',
        422,
        error
      );
    }

    // -----------------------------------------
    // GENERIC ERROR
    // -----------------------------------------

    throw new GeminiAnalysisError(
      `Gemini API request failed: ${message}`,
      502,
      error
    );
  }

  // ---------------------------------------------
  // 7. RESPONSE TEXT
  // ---------------------------------------------

  const text =
    response?.text;

  if (
    !text ||
    typeof text !== 'string'
  ) {

    console.error(
      '[Gemini] Empty response:',
      response
    );

    throw new GeminiAnalysisError(
      'Gemini did not return any analysis for this image.',
      502
    );
  }

  // ---------------------------------------------
  // 8. PARSE JSON
  // ---------------------------------------------

  let parsed: unknown;

  try {

    const cleanedText =
      stripCodeFences(text);

    parsed =
      JSON.parse(cleanedText);

  } catch (error) {

    console.error(
      '[Gemini] JSON parsing failed.'
    );

    console.error(
      '[Gemini] Raw response:',
      text
    );

    throw new GeminiAnalysisError(
      'Gemini returned a response that could not be parsed as JSON.',
      502,
      error
    );
  }

  // ---------------------------------------------
  // 9. NORMALIZE RESULT
  // ---------------------------------------------

  try {

    return normalizeResult(parsed);

  } catch (error) {

    if (
      error instanceof GeminiAnalysisError
    ) {
      throw error;
    }

    throw new GeminiAnalysisError(
      'Gemini returned invalid analysis data.',
      502,
      error
    );
  }
}