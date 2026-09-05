import {
  analyzeImageWithGemini,
  GeminiAnalysisError,
} from './lib/geminiAnalyze';

/**
 * POST /api/analyze-image
 *
 * The frontend sends:
 *
 * {
 *   image: "<base64>",
 *   mimeType: "image/jpeg"
 * }
 *
 * This server-side route forwards the image to the AI
 * analysis module.
 *
 * NOTE:
 * The function is still named analyzeImageWithGemini()
 * for compatibility with the existing project.
 *
 * The implementation inside geminiAnalyze.ts now uses
 * Groq + Qwen Vision.
 */

interface AnalyzeImageBody {
  image?: string;
  mimeType?: string;
}

interface VercelLikeRequest {
  method?: string;
  body?: unknown;
}

interface VercelLikeResponse {
  status: (code: number) => VercelLikeResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
}

/**
 * Safely parse the request body.
 */
function parseBody(
  body: unknown
): AnalyzeImageBody | null {

  if (!body) {
    return null;
  }

  // Vercel / serverless environments can provide
  // the body either as an object or JSON string.
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);

      if (
        parsed &&
        typeof parsed === 'object'
      ) {
        return parsed as AnalyzeImageBody;
      }

      return null;

    } catch {
      return null;
    }
  }

  if (
    typeof body === 'object'
  ) {
    return body as AnalyzeImageBody;
  }

  return null;
}

/**
 * Validate base64 image data.
 */
function isValidBase64Image(
  image: unknown
): image is string {

  if (
    typeof image !== 'string' ||
    image.trim().length === 0
  ) {
    return false;
  }

  /*
   * The frontend sends only the base64 portion,
   * without the data:image/... prefix.
   */
  return /^[A-Za-z0-9+/=\s]+$/.test(
    image
  );
}

/**
 * Validate supported image MIME types.
 */
function isSupportedMimeType(
  mimeType: unknown
): boolean {

  if (
    typeof mimeType !== 'string'
  ) {
    return false;
  }

  return [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ].includes(mimeType);
}

/**
 * Main API handler.
 */
export default async function handler(
  req: VercelLikeRequest,
  res: VercelLikeResponse
) {

  // =============================================
  // CORS / response headers
  // =============================================

  res.setHeader(
    'Content-Type',
    'application/json'
  );

  res.setHeader(
    'Cache-Control',
    'no-store'
  );

  // =============================================
  // METHOD CHECK
  // =============================================

  if (
    req.method !== 'POST'
  ) {

    res.status(405).json({
      error:
        'Method not allowed. Use POST.',
    });

    return;
  }

  // =============================================
  // PARSE BODY
  // =============================================

  const body =
    parseBody(req.body);

  if (!body) {

    res.status(400).json({
      error:
        'Invalid request body. Expected JSON containing an image.',
    });

    return;
  }

  // =============================================
  // IMAGE CHECK
  // =============================================

  if (
    !isValidBase64Image(body.image)
  ) {

    res.status(400).json({
      error:
        'No valid image was provided.',
    });

    return;
  }

  // =============================================
  // MIME TYPE
  // =============================================

  const mimeType =
    isSupportedMimeType(body.mimeType)
      ? body.mimeType!
      : 'image/jpeg';

  // =============================================
  // IMAGE SIZE CHECK
  // =============================================

  const base64Image =
    body.image.replace(
      /\s/g,
      ''
    );

  const approximateBytes =
    Math.floor(
      (base64Image.length * 3) / 4
    );

  const MAX_IMAGE_BYTES =
    12 * 1024 * 1024;

  if (
    approximateBytes >
    MAX_IMAGE_BYTES
  ) {

    res.status(413).json({
      error:
        'The image is too large. Please capture a smaller image and try again.',
    });

    return;
  }

  // =============================================
  // AI ANALYSIS
  // =============================================

  try {

    console.log(
      '[API] /api/analyze-image request received'
    );

    console.log(
      '[API] Image MIME type:',
      mimeType
    );

    console.log(
      '[API] Approximate image size:',
      Math.round(
        approximateBytes / 1024
      ),
      'KB'
    );

    const result =
      await analyzeImageWithGemini(
        base64Image,
        mimeType
      );

    // =========================================
    // SUCCESS
    // =========================================

    console.log(
      '[API] AI analysis successful'
    );

    console.log(
      '[API] Device:',
      result.device
    );

    console.log(
      '[API] Components detected:',
      result.components.length
    );

    res.status(200).json(
      result
    );

  } catch (error) {

    // =========================================
    // KNOWN AI ERROR
    // =========================================

    if (
      error instanceof GeminiAnalysisError
    ) {

      console.error(
        '[API] AI analysis error:',
        error.publicMessage
      );

      res.status(
        error.statusCode
      ).json({
        error:
          error.publicMessage,
      });

      return;
    }

    // =========================================
    // UNKNOWN ERROR
    // =========================================

    console.error(
      '[API] Unexpected error:',
      error
    );

    res.status(500).json({
      error:
        'Something went wrong while analyzing the image.',
    });

    return;
  }
}