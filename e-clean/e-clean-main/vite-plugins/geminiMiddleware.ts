import type {
  Plugin,
  ViteDevServer,
} from 'vite';

import {
  loadEnv,
} from 'vite';

import type {
  IncomingMessage,
  ServerResponse,
} from 'node:http';

import {
  analyzeImageWithGemini,
  GeminiAnalysisError,
} from '../api/geminiAnalyze';

/*
 * ==========================================
 * READ REQUEST BODY
 * ==========================================
 */

function readRequestBody(
  req: IncomingMessage
): Promise<string> {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      let data = '';

      let size = 0;

      const MAX_SIZE =
        15 * 1024 * 1024;

      req.on(
        'data',
        (
          chunk: Buffer
        ) => {

          size +=
            chunk.length;

          if (
            size > MAX_SIZE
          ) {

            reject(
              new Error(
                'Payload too large'
              )
            );

            req.destroy();

            return;
          }

          data +=
            chunk.toString();
        }
      );

      req.on(
        'end',
        () => {

          resolve(data);
        }
      );

      req.on(
        'error',
        reject
      );
    }
  );
}

/*
 * ==========================================
 * JSON RESPONSE
 * ==========================================
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

/*
 * ==========================================
 * VITE DEVELOPMENT API
 * ==========================================
 */

export function geminiDevApiPlugin(): Plugin {

  return {

    name:
      'gemini-dev-api-middleware',

    configureServer(
      server: ViteDevServer
    ) {

      // ========================================
      // LOAD .ENV
      // ========================================

      const env =
        loadEnv(
          server.config.mode,
          server.config.root,
          ''
        );

      // ========================================
      // GROQ API KEY
      // ========================================

      if (
        env.GROQ_API_KEY
      ) {

        process.env.GROQ_API_KEY =
          env.GROQ_API_KEY;

        console.log(
          '[AI] GROQ_API_KEY loaded successfully.'
        );

      } else {

        console.error(
          '[AI] GROQ_API_KEY was NOT found.'
        );
      }

      // ========================================
      // API ROUTE
      // ========================================

      server.middlewares.use(
        '/api/analyze-image',
        async (
          req,
          res
        ) => {

          // ====================================
          // METHOD
          // ====================================

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

          try {

            // ==================================
            // BODY
            // ==================================

            const rawBody =
              await readRequestBody(
                req
              );

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

            // ==================================
            // IMAGE
            // ==================================

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

            // ==================================
            // MIME
            // ==================================

            const mimeType =
              typeof parsed.mimeType === 'string'
                ? parsed.mimeType
                : 'image/jpeg';

            // ==================================
            // LOG
            // ==================================

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

            // ==================================
            // AI
            // ==================================

            const result =
              await analyzeImageWithGemini(
                parsed.image,
                mimeType
              );

            // ==================================
            // SUCCESS
            // ==================================

            console.log(
              '[AI] Analysis successful.'
            );

            sendJson(
              res,
              200,
              result
            );

          } catch (error) {

            // ==================================
            // KNOWN ERROR
            // ==================================

            if (
              error instanceof GeminiAnalysisError
            ) {

              console.error(
                '[AI] Analysis error:',
                error.publicMessage
              );

              sendJson(
                res,
                error.statusCode,
                {
                  error:
                    error.publicMessage,
                }
              );

              return;
            }

            // ==================================
            // UNKNOWN ERROR
            // ==================================

            console.error(
              '[AI] Unexpected error:',
              error
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