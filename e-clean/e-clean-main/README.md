# e-clean — E-Waste Component Detection

Scan electronic devices and boards with your camera and get an AI-powered breakdown
of visible components, materials, and recovery/reuse potential — powered by Google's
Gemini Vision API.

## Quick start

1. Extract the ZIP.
2. Open the project folder in VS Code (or your terminal of choice).
3. Install dependencies:

   ```
   npm install
   ```

4. Open the `.env` file in the project root and fill in your Gemini API key:

   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

   Get a key from [Google AI Studio](https://aistudio.google.com/app/apikey).

   If you use the existing Supabase history feature, also fill in:

   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. Run the app:

   ```
   npm run dev
   ```

6. Open the local URL Vite prints (usually `http://localhost:5173`).
7. Go to **Scan**.
8. Click **Start Camera** and allow camera permission.
9. Point the camera at an electronic board/device and click **Capture**.
10. Click **Scan Image** to send the photo to Gemini for real analysis.
11. Review the detected components, confidence scores, bounding boxes, material
    breakdown, and recovery workflow.

You can also click **Run demo scan** at any time to see a sample Arduino UNO result
without using your camera or your Gemini quota.

## How the Gemini integration works

- The **frontend never talks to Gemini directly** and never sees your API key.
- When you click "Scan Image", the captured photo is sent to `POST /api/analyze-image`.
- In development, that endpoint is served automatically by a Vite dev-server
  middleware (`vite-plugins/geminiMiddleware.ts`) — there is no separate backend
  process to start. `npm run dev` is all you need.
- In production (e.g. Vercel), the same logic runs as a serverless function at
  `api/analyze-image.ts`. Set `GEMINI_API_KEY` as a server-side environment variable
  in your Vercel project settings (not a `VITE_`-prefixed variable) and it will work
  automatically after deployment.
- The shared analysis logic lives in `api/_lib/geminiAnalyze.ts` and is used by both
  the dev middleware and the production function, so behavior stays identical.

## Important notes

- **Never commit your real API key.** `.env` is already listed in `.gitignore`.
  Only `.env.example` (with blank values) should ever be committed.
- Gemini's analysis is a **visual estimate only**. A photograph cannot verify
  electrical functionality, and the app's results will always include a disclaimer
  to that effect.
- Always physically and electrically test a component before actually reusing it,
  regardless of what the scan reports.
- If a scan returns few or no components, try a closer, better-lit, more in-focus
  photo — Gemini is instructed not to guess at components it can't actually see.

## Troubleshooting

| Problem | Likely cause |
|---|---|
| "The server is missing a GEMINI_API_KEY" | You haven't set `GEMINI_API_KEY` in `.env` (dev) or your host's env vars (production), or you need to restart `npm run dev` after editing `.env`. |
| "The Gemini API key is invalid" | Double-check the key was copied correctly from Google AI Studio. |
| "The Gemini API rate limit or quota was exceeded" | Wait a bit and try again, or check your Gemini API usage/billing. |
| Camera won't start | Make sure you allowed camera permission in the browser, and that you're on `localhost` or HTTPS (required by browsers for camera access). |
| History doesn't save | Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly. |

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS
- Supabase (scan history)
- Google Gemini API (`@google/genai`) for real image analysis, called only from
  a secure server-side endpoint
