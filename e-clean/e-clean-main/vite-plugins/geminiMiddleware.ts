import type { Plugin, ViteDevServer } from 'vite';
import { loadEnv } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  analyzeImageWithGemini,
  GeminiAnalysisError,
} from '../api/_lib/geminiAnalyze';

/**
 * Read the incoming HTTP request body.
 */
function readRequestBody(
  req: IncomingMessage
): Promise<string> {

  return new Promise(
    (resolve, reject) => {

      let data = '';
      let size = 0;

      // 15 MB request limit
      const MAX_SIZE =
        15 * 1024 * 1024;

      req.on(
        'data',
        (chunk: Buffer) => {

          size += chunk.length;

          if (size > MAX_SIZE) {

            reject(
              new Error(
                'Payload too large'
              )
            );

            req.destroy();

            return;
          }

          data += chunk.toString();
        }
      );

      req.on(
        'end',
        () => resolve(data)
      );

      req.on(
        'error',
        reject
      );
    }
  );
}

/**
 * Send JSON response.
 */
function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown
) {

  res.statusCode =
    statusCode;

  res.setHeader(
    'Content-Type',
    'application/json'
  );

  res.setHeader(
    'Cache-Control',
    'no-store'
  );

  res.end(
    JSON.stringify(payload)
  );
}

/**
 * Vite development API plugin.
 *
 * This creates:
 *
 * POST /api/analyze-image
 *
 * during local development.
 *
 * IMPORTANT:
 *
 * Vite loads .env values into its own environment,
 * but process.env does not automatically receive them.
 *
 * Our Gemini/Groq server module reads:
 *
 * process.env.GROQ_API_KEY
 *
 * Therefore we explicitly load the .env file and
 * copy GROQ_API_KEY into process.env.
 */
export function geminiDevApiPlugin(): Plugin {

  return {

    name:
      'gemini-dev-api-middleware',

    configureServer(
      server: ViteDevServer
    ) {

      // ==========================================
      // LOAD .ENV FILE
      // ==========================================

      const env =
        loadEnv(
          server.config.mode,
          server.config.root,
          ''
        );

      // ==========================================
      // LOAD GROQ API KEY
      // ==========================================

      if (env.GROQ_API_KEY) {

        process.env.GROQ_API_KEY =
          env.GROQ_API_KEY;

        console.log(
          '[AI] GROQ_API_KEY loaded successfully.'
        );

      } else {

        console.error(
          '[AI] GROQ_API_KEY was NOT found in .env'
        );

        console.error(
          '[AI] Expected .env location:',
          server.config.root
        );
      }

      // ==========================================
      // REGISTER API ROUTE
      // ==========================================

      server.middlewares.use(
        '/api/analyze-image',
        async (
          req,
          res
        ) => {

          // ========================================
          // METHOD CHECK
          // ========================================

          if (
            req.method !== 'POST'
          ) {

            sendJson(
              res,
              405,
              {
                error:
                  'Method not allowed. Use POST.',
              }
            );

            return;
          }

          // ========================================
          // REQUEST BODY
          // ========================================

          try {

            const rawBody =
              await readRequestBody(
                req
              );

            // ======================================
            // PARSE JSON
            // ======================================

            let parsed: {
              image?: string;
              mimeType?: string;
            };

            try {

              parsed =
                JSON.parse(
                  rawBody || '{}'
                );

            } catch {

              sendJson(
                res,
                400,
                {
                  error:
                    'Invalid JSON body.',
                }
              );

              return;
            }

            // ======================================
            // IMAGE VALIDATION
            // ======================================

            if (
              !parsed.image ||
              typeof parsed.image !== 'string'
            ) {

              sendJson(
                res,
                400,
                {
                  error:
                    'No image was provided.',
                }
              );

              return;
            }

            // ======================================
            // MIME TYPE
            // ======================================

            const mimeType =
              typeof parsed.mimeType === 'string'
                ? parsed.mimeType
                : 'image/jpeg';

            // ======================================
            // DEBUG
            // ======================================

            console.log(
              '[AI] Image analysis request received.'
            );

            console.log(
              '[AI] MIME type:',
              mimeType
            );

            console.log(
              '[AI] GROQ key available:',
              Boolean(
                process.env.GROQ_API_KEY
              )
            );

            // ======================================
            // CALL AI
            // ======================================

            const result =
              await analyzeImageWithGemini(
                parsed.image,
                mimeType
              );

            // ======================================
            // SUCCESS
            // ======================================

            console.log(
              '[AI] Analysis successful.'
            );

            console.log(
              '[AI] Device:',
              result.device
            );

            console.log(
              '[AI] Components:',
              result.components.length
            );

            sendJson(
              res,
              200,
              result
            );

          } catch (err) {

            // ======================================
            // KNOWN AI ERROR
            // ======================================

            if (
              err instanceof GeminiAnalysisError
            ) {

              console.error(
                '[AI] Analysis error:',
                err.publicMessage
              );

              sendJson(
                res,
                err.statusCode,
                {
                  error:
                    err.publicMessage,
                }
              );

              return;
            }

            // ======================================
            // UNKNOWN ERROR
            // ======================================

            console.error(
              '[AI] Unexpected API error:',
              err
            );

            sendJson(
              res,
              500,
              {
                error:
                  'Something went wrong while analyzing the image.',
              }
            );
          }
        }
      );
    },
  };
}