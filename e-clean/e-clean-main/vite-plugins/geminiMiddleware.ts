import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { analyzeImageWithGemini, GeminiAnalysisError } from '../api/_lib/geminiAnalyze';

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    const MAX_SIZE = 15 * 1024 * 1024; // 15 MB raw request cap

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_SIZE) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

/**
 * Registers a `/api/analyze-image` endpoint directly on Vite's dev server
 * so the Gemini backend works automatically with `npm run dev` — no
 * separate server process required. In production (e.g. Vercel), the
 * equivalent logic runs from api/analyze-image.ts as a serverless
 * function instead; this plugin only affects local development.
 */
export function geminiDevApiPlugin(): Plugin {
  return {
    name: 'gemini-dev-api-middleware',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/analyze-image', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
          return;
        }

        try {
          const rawBody = await readRequestBody(req);
          let parsed: { image?: string; mimeType?: string };
          try {
            parsed = JSON.parse(rawBody || '{}');
          } catch {
            sendJson(res, 400, { error: 'Invalid JSON body.' });
            return;
          }

          if (!parsed.image) {
            sendJson(res, 400, { error: 'No image was provided.' });
            return;
          }

          const result = await analyzeImageWithGemini(parsed.image, parsed.mimeType ?? 'image/jpeg');
          sendJson(res, 200, result);
        } catch (err) {
          if (err instanceof GeminiAnalysisError) {
            console.error('[gemini] analysis error:', err.message, err.cause ?? '');
            sendJson(res, err.statusCode, { error: err.publicMessage });
            return;
          }
          console.error('[gemini] unexpected /api/analyze-image error:', err);
          sendJson(res, 500, { error: 'Something went wrong while analyzing the image.' });
        }
      });
    },
  };
}
