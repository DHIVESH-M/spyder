import { analyzeImageWithGemini, GeminiAnalysisError } from './_lib/geminiAnalyze';

/**
 * Vercel serverless function: POST /api/analyze-image
 *
 * Runs server-side only. The GEMINI_API_KEY environment variable must be
 * configured in the Vercel project settings (Settings -> Environment
 * Variables) — it is never sent to or bundled into the frontend.
 *
 * During local development this same logic runs through the Vite dev
 * middleware in vite-plugins/geminiMiddleware.ts, so `npm run dev` works
 * without any extra setup.
 */

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

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as
      | { image?: string; mimeType?: string }
      | undefined;

    if (!body?.image) {
      res.status(400).json({ error: 'No image was provided.' });
      return;
    }

    const result = await analyzeImageWithGemini(body.image, body.mimeType ?? 'image/jpeg');
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof GeminiAnalysisError) {
      console.error('Gemini analysis error:', err.message, err.cause ?? '');
      res.status(err.statusCode).json({ error: err.publicMessage });
      return;
    }
    console.error('Unexpected /api/analyze-image error:', err);
    res.status(500).json({ error: 'Something went wrong while analyzing the image.' });
  }
}
