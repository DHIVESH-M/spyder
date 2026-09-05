import {
  analyzeImageWithGemini,
  GeminiAnalysisError,
} from './geminiAnalyze';

interface AnalyzeImageBody {
  image?: string;
  mimeType?: string;
}

interface VercelRequest {
  method?: string;
  body?: unknown;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

function parseBody(
  body: unknown
): AnalyzeImageBody | null {

  if (!body) {
    return null;
  }

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

  if (typeof body === 'object') {
    return body as AnalyzeImageBody;
  }

  return null;
}

function isValidBase64Image(
  image: unknown
): image is string {

  if (
    typeof image !== 'string' ||
    image.trim().length === 0
  ) {
    return false;
  }

  return /^[A-Za-z0-9+/=\s]+$/.test(image);
}

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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {

  res.setHeader(
    'Content-Type',
    'application/json'
  );

  res.setHeader(
    'Cache-Control',
    'no-store'
  );

  // ==========================================
  // METHOD
  // ==========================================

  if (req.method !== 'POST') {

    res.status(405).json({
      error:
        'Method not allowed. Use POST.',
    });

    return;
  }

  // ==========================================
  // BODY
  // ==========================================

  const body =
    parseBody(req.body);

  if (!body) {

    res.status(400).json({
      error:
        'Invalid request body.',
    });

    return;
  }

  // ==========================================
  // IMAGE
  // ==========================================

  if (
    !isValidBase64Image(body.image)
  ) {

    res.status(400).json({
      error:
        'No valid image was provided.',
    });

    return;
  }

  // ==========================================
  // MIME TYPE
  // ==========================================

  const mimeType =
    isSupportedMimeType(
      body.mimeType
    )
      ? body.mimeType
      : 'image/jpeg';

  // ==========================================
  // CLEAN BASE64
  // ==========================================

  const base64Image =
    body.image.replace(
      /\s/g,
      ''
    );

  // ==========================================
  // IMAGE SIZE
  // ==========================================

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

  // ==========================================
  // AI ANALYSIS
  // ==========================================

  try {

    console.log(
      '[API] /api/analyze-image request received'
    );

    console.log(
      '[API] MIME:',
      mimeType
    );

    console.log(
      '[API] Image size:',
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

    console.log(
      '[API] AI analysis successful'
    );

    console.log(
      '[API] Device:',
      result.device
    );

    console.log(
      '[API] Components:',
      result.components.length
    );

    res.status(200).json(
      result
    );

  } catch (error) {

    if (
      error instanceof GeminiAnalysisError
    ) {

      console.error(
        '[API] AI error:',
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

    console.error(
      '[API] Unexpected error:',
      error
    );

    res.status(500).json({
      error:
        'Something went wrong while analyzing the image.',
    });
  }
}