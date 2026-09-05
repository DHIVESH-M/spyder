import Groq from 'groq-sdk';

export interface DetectedComponentJSON {

  id: string;

  name: string;

  confidence: number;

  materials: string[];

  recoveryMethod: string;

  recoveryPotential:
    | 'High'
    | 'Medium'
    | 'Low'
    | 'Possible';

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

  potential:
    | 'High'
    | 'Medium'
    | 'Low'
    | 'Possible';

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

/*
 * ==========================================
 * CUSTOM ERROR
 * ==========================================
 */

export class GeminiAnalysisError
  extends Error {

  statusCode: number;

  publicMessage: string;

  constructor(
    publicMessage: string,
    statusCode = 500,
    cause?: unknown
  ) {

    super(publicMessage);

    this.name =
      'GeminiAnalysisError';

    this.statusCode =
      statusCode;

    this.publicMessage =
      publicMessage;

    if (cause) {

      (
        this as {
          cause?: unknown;
        }
      ).cause = cause;
    }
  }
}

/*
 * ==========================================
 * GROQ MODEL
 * ==========================================
 */

const MODEL_NAME =
  'qwen/qwen3.6-27b';

/*
 * ==========================================
 * PROMPT
 * ==========================================
 */

const PROMPT = `
You are an expert electronics identification
and e-waste recovery analyst.

Analyze the attached photograph.

Identify the electronic device and only the
components that are visually confirmed.

Do NOT hallucinate components.

Do NOT assume a component exists just because
it is common on that type of device.

Only report components that are actually visible.

DEVICE IDENTIFICATION:

Identify the overall device or circuit board.

Examples:

Arduino UNO
Raspberry Pi
ESP32
Mobile phone PCB
Laptop motherboard
Power supply board
Circuit board
Electronic module
Sensor board
Unidentified circuit board

If the exact device cannot be determined,
use:

"Unidentified circuit board"

Confidence must be 0-100.

COMPONENTS:

Identify clearly visible components such as:

PCB
Microcontroller
IC
USB connector
Pin headers
LEDs
Capacitors
Resistors
Crystal oscillator
Diodes
Transistors
Voltage regulators
Connectors
Switches
Buttons
Batteries
Cables
Heatsinks
Transformers
Coils

For every component provide:

id
name
confidence
materials
recoveryMethod
recoveryPotential
reason
box

Bounding box values must be percentages
from 0 to 100.

x = left
y = top
w = width
h = height

MATERIALS:

Identify visually reasonable recoverable materials.

Examples:

Copper
Aluminum
Steel
Gold
Silver
Plastic
PCB material
Electronic components

For each material provide:

id
name
potential
note

RECOVERY WORKFLOW:

Create a practical and safe e-waste recovery
workflow.

Each step must contain:

step
title
detail

Do not recommend dangerous procedures.

RECOVERY POTENTIAL:

Provide:

score
componentReuse
materialRecovery

All values must be between 0 and 100.

IMPORTANT:

A photograph cannot verify electrical
functionality.

Physical and electrical testing is required
before actual reuse.

RETURN ONLY VALID JSON.

Do not use Markdown.

Required JSON structure:

{
  "device": "string",
  "confidence": 0,
  "components": [],
  "materials": [],
  "recoveryWorkflow": [],
  "recoveryPotential": {
    "score": 0,
    "componentReuse": 0,
    "materialRecovery": 0
  },
  "disclaimer": "string"
}
`;

/*
 * ==========================================
 * HELPERS
 * ==========================================
 */

function clampPercent(
  value: unknown
): number {

  const numberValue =
    typeof value === 'number' &&
    Number.isFinite(value)
      ? value
      : 0;

  return Math.max(
    0,
    Math.min(
      100,
      numberValue
    )
  );
}

function validPotential(
  value: unknown
):
  | 'High'
  | 'Medium'
  | 'Low'
  | 'Possible' {

  if (
    value === 'High' ||
    value === 'Medium' ||
    value === 'Low' ||
    value === 'Possible'
  ) {
    return value;
  }

  return 'Possible';
}

/*
 * ==========================================
 * NORMALIZE RESULT
 * ==========================================
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

  const data =
    raw as Record<string, unknown>;

  const rawComponents =
    Array.isArray(data.components)
      ? data.components
      : [];

  const rawMaterials =
    Array.isArray(data.materials)
      ? data.materials
      : [];

  const rawWorkflow =
    Array.isArray(
      data.recoveryWorkflow
    )
      ? data.recoveryWorkflow
      : [];

  const rawPotential =
    data.recoveryPotential &&
    typeof data.recoveryPotential === 'object'
      ? data.recoveryPotential
        as Record<string, unknown>
      : {};

  return {

    device:
      typeof data.device === 'string' &&
      data.device.trim()
        ? data.device.trim()
        : 'Unidentified circuit board',

    confidence:
      clampPercent(
        data.confidence
      ),

    components:
      rawComponents.map(
        (
          item,
          index
        ) => {

          const component =
            item &&
            typeof item === 'object'
              ? item as Record<string, unknown>
              : {};

          const rawBox =
            component.box &&
            typeof component.box === 'object'
              ? component.box
                as Record<string, unknown>
              : {};

          const rawMaterials =
            Array.isArray(
              component.materials
            )
              ? component.materials
              : [];

          return {

            id:
              typeof component.id === 'string'
                ? component.id
                : `component-${index + 1}`,

            name:
              typeof component.name === 'string'
                ? component.name
                : `Component ${index + 1}`,

            confidence:
              clampPercent(
                component.confidence
              ),

            materials:
              rawMaterials.filter(
                (
                  material
                ): material is string =>
                  typeof material === 'string'
              ),

            recoveryMethod:
              typeof component.recoveryMethod === 'string'
                ? component.recoveryMethod
                : 'Inspect and test before reuse.',

            recoveryPotential:
              validPotential(
                component.recoveryPotential
              ),

            reason:
              typeof component.reason === 'string'
                ? component.reason
                : 'Component identification is based on visible features.',

            box: {

              x:
                clampPercent(
                  rawBox.x
                ),

              y:
                clampPercent(
                  rawBox.y
                ),

              w:
                clampPercent(
                  rawBox.w
                ),

              h:
                clampPercent(
                  rawBox.h
                ),
            },
          };
        }
      ),

    materials:
      rawMaterials.map(
        (
          item,
          index
        ) => {

          const material =
            item &&
            typeof item === 'object'
              ? item as Record<string, unknown>
              : {};

          return {

            id:
              typeof material.id === 'string'
                ? material.id
                : `material-${index + 1}`,

            name:
              typeof material.name === 'string'
                ? material.name
                : `Material ${index + 1}`,

            potential:
              validPotential(
                material.potential
              ),

            note:
              typeof material.note === 'string'
                ? material.note
                : undefined,
          };
        }
      ),

    recoveryWorkflow:
      rawWorkflow.map(
        (
          item,
          index
        ) => {

          const step =
            item &&
            typeof item === 'object'
              ? item as Record<string, unknown>
              : {};

          return {

            step:
              typeof step.step === 'number'
                ? step.step
                : index + 1,

            title:
              typeof step.title === 'string'
                ? step.title
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
          rawPotential.score
        ),

      componentReuse:
        clampPercent(
          rawPotential.componentReuse
        ),

      materialRecovery:
        clampPercent(
          rawPotential.materialRecovery
        ),
    },

    disclaimer:
      typeof data.disclaimer === 'string'
        ? data.disclaimer
        : 'A photograph cannot verify electrical functionality. Physical and electrical testing is required before reuse.',
  };
}

/*
 * ==========================================
 * MAIN FUNCTION
 * ==========================================
 */

export async function analyzeImageWithGemini(
  base64Image: string,
  mimeType: string
): Promise<GeminiScanResult> {

  const apiKey =
    process.env.GROQ_API_KEY;

  // ==========================================
  // API KEY CHECK
  // ==========================================

  if (!apiKey) {

    throw new GeminiAnalysisError(
      'GROQ_API_KEY is missing on the server.',
      500
    );
  }

  // ==========================================
  // IMAGE CHECK
  // ==========================================

  if (
    !base64Image ||
    typeof base64Image !== 'string'
  ) {

    throw new GeminiAnalysisError(
      'No image was provided.',
      400
    );
  }

  const allowedMimeTypes = [

    'image/jpeg',

    'image/jpg',

    'image/png',

    'image/webp',
  ];

  const cleanMimeType =
    allowedMimeTypes.includes(
      mimeType
    )
      ? mimeType
      : 'image/jpeg';

  // ==========================================
  // GROQ CLIENT
  // ==========================================

  const groq =
    new Groq({
      apiKey,
    });

  // ==========================================
  // DATA URL
  // ==========================================

  const imageDataUrl =
    `data:${cleanMimeType};base64,${base64Image}`;

  try {

    console.log(
      '[Groq] Starting image analysis...'
    );

    console.log(
      '[Groq] Model:',
      MODEL_NAME
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

        response_format: {

          type:
            'json_object',
        },

        temperature:
          0.2,

        max_completion_tokens:
          5000,

        reasoning_effort:
          'none',
      });

    console.log(
      '[Groq] Response received.'
    );

    // ========================================
    // GET RESPONSE
    // ========================================

    const text =
      completion
        .choices?.[0]
        ?.message?.content;

    if (
      !text ||
      typeof text !== 'string'
    ) {

      throw new GeminiAnalysisError(
        'The AI service returned an empty response.',
        502
      );
    }

    // ========================================
    // PARSE JSON
    // ========================================

    let parsed: unknown;

    try {

      parsed =
        JSON.parse(text);

    } catch (error) {

      console.error(
        '[Groq] Invalid JSON:',
        text
      );

      throw new GeminiAnalysisError(
        'The AI service returned invalid JSON.',
        502,
        error
      );
    }

    // ========================================
    // NORMALIZE
    // ========================================

    return normalizeResult(
      parsed
    );

  } catch (error) {

    if (
      error instanceof GeminiAnalysisError
    ) {

      throw error;
    }

    console.error(
      '[Groq] Analysis failed:',
      error
    );

    throw new GeminiAnalysisError(
      'Unable to analyze the image with the AI service.',
      502,
      error
    );
  }
}