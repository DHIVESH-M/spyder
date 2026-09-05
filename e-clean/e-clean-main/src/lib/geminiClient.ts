import type { ScanResult } from './types';

/**
 * Calls the secure server-side /api/analyze-image endpoint with a
 * captured image. The Gemini API key never touches the browser — it
 * lives only in the server environment (see api/_lib/geminiAnalyze.ts).
 */
export async function analyzeImage(imageDataUrl: string): Promise<ScanResult> {
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    throw new Error('Could not prepare the captured image for analysis.');
  }

  const [, mimeType, base64] = match;

  let response: Response;
  try {
    response = await fetch('/api/analyze-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, mimeType }),
    });
  } catch {
    throw new Error('Could not reach the analysis server. Check your network connection and try again.');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Received an unexpected response from the analysis server.');
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : 'Something went wrong while analyzing the image.';
    throw new Error(message);
  }

  return payload as ScanResult;
}
