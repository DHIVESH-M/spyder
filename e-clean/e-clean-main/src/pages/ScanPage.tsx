import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Circle,
  RefreshCw,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
} from 'lucide-react';

import { useRouter } from '@/lib/router';
import { detectDevice } from '@/lib/mockData';
import { analyzeImage } from '@/lib/geminiClient';
import { saveScan } from '@/lib/supabaseClient';

import type {
  ScanResult,
  DetectedComponent,
} from '@/lib/types';

import DetectionImage from '@/components/DetectionImage';
import ConfidenceBar from '@/components/ConfidenceBar';
import PotentialBadge from '@/components/PotentialBadge';

type Phase =
  | 'idle'
  | 'camera'
  | 'captured'
  | 'scanning'
  | 'result';

/*
 * Arduino UNO demo image
 */
const placeholderImage =
  'https://www.arduino.cc/en/uploads/Main/ArduinoUno_R3_Front.jpg';

export default function ScanPage() {
  const { navigate } = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');

  const [capturedUrl, setCapturedUrl] =
    useState<string | null>(null);

  const [result, setResult] =
    useState<ScanResult | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [activeComponent, setActiveComponent] =
    useState<DetectedComponent | null>(null);

  /*
   * Cleanup camera when leaving page
   */
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  /*
   * START CAMERA
   *
   * Important:
   * We set phase = camera FIRST.
   * This allows React to render <video>.
   * Then we attach the MediaStream.
   */
  const startCamera = async () => {
    setError(null);

    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          'Camera API is not supported in this browser.'
        );
      }

      /*
       * Stop any previous camera stream
       */
      stopCamera();

      /*
       * Ask browser for camera access
       */
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: 'environment',
            },
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      /*
       * Save stream
       */
      streamRef.current = stream;

      /*
       * IMPORTANT:
       * Render the video element first.
       */
      setPhase('camera');

      /*
       * Wait until React renders <video>
       */
      requestAnimationFrame(async () => {
        const video = videoRef.current;

        if (!video) {
          setError(
            'Camera preview could not be initialized.'
          );

          stopCamera();
          setPhase('idle');

          return;
        }

        try {
          video.srcObject = stream;

          video.muted = true;
          video.playsInline = true;

          await video.play();
        } catch (playError) {
          console.error(
            'Camera video play error:',
            playError
          );

          setError(
            'Could not start the camera preview.'
          );

          stopCamera();
          setPhase('idle');
        }
      });
    } catch (cameraError) {
      console.error(
        'Camera access error:',
        cameraError
      );

      setError(
        'Could not access the camera. Please allow camera permission in your browser and try again.'
      );

      stopCamera();
      setPhase('idle');
    }
  };

  /*
   * STOP CAMERA
   */
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });
    }

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  /*
   * CAPTURE CAMERA IMAGE
   */
  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setError(
        'Camera is not ready yet. Please wait a moment and try again.'
      );

      return;
    }

    /*
     * Make sure video has actual dimensions
     */
    if (
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setError(
        'Camera image is not ready yet. Please wait a moment and try again.'
      );

      return;
    }

    /*
     * Set canvas dimensions to camera dimensions
     */
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      setError(
        'Could not capture the camera image.'
      );

      return;
    }

    /*
     * Draw current camera frame
     */
    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    /*
     * Convert frame to image
     */
    const imageUrl =
      canvas.toDataURL(
        'image/jpeg',
        0.85
      );

    setCapturedUrl(imageUrl);

    /*
     * Stop camera
     */
    stopCamera();

    /*
     * Show captured image
     */
    setPhase('captured');
  };

  /*
   * RETAKE
   */
  const retake = () => {
    setCapturedUrl(null);
    setResult(null);
    setActiveComponent(null);
    setError(null);

    startCamera();
  };

  /*
   * RUN REAL CAMERA SCAN
   *
   * Sends the captured image to the secure server-side
   * /api/analyze-image endpoint, which calls Gemini Vision.
   * The API key never touches the browser.
   */
  const runScan = async () => {
    setError(null);
    setPhase('scanning');

    try {
      if (!capturedUrl) {
        throw new Error('No captured image was found. Please capture a photo first.');
      }

      /*
       * Send captured image to Gemini via the secure API route
       */
      const res = await analyzeImage(capturedUrl);

      setResult(res);
      setPhase('result');

      /*
       * Save scan to Supabase
       */
      try {
        await saveScan({
          device_name: res.device,

          confidence: res.confidence,

          recovery_score:
            res.recoveryPotential.score,

          component_reuse:
            res.recoveryPotential.componentReuse,

          material_recovery:
            res.recoveryPotential.materialRecovery,

          image_url:
            capturedUrl ??
            placeholderImage,

          components:
            res.components,

          materials:
            res.materials,

          workflow:
            res.recoveryWorkflow,
        });
      } catch (saveError) {
        console.error(
          'Could not save scan:',
          saveError
        );
      }
    } catch (scanError) {
      console.error(
        'Scan error:',
        scanError
      );

      setError(
        scanError instanceof Error
          ? scanError.message
          : 'Something went wrong while analyzing the image.'
      );

      setPhase('captured');
    }
  };

  /*
   * DEMO SCAN
   *
   * Shows Arduino UNO image.
   */
  const runDemoScan = async () => {
    setError(null);

    /*
     * Clear previous camera image
     */
    setCapturedUrl(placeholderImage);

    setActiveComponent(null);

    /*
     * Show scanning animation
     */
    setPhase('scanning');

    try {
      /*
       * Run predefined demo detection
       */
      const res = await detectDevice(
        new Blob()
      );

      setResult(res);
      setPhase('result');

      /*
       * Save demo result
       */
      try {
        await saveScan({
          device_name: res.device,

          confidence: res.confidence,

          recovery_score:
            res.recoveryPotential.score,

          component_reuse:
            res.recoveryPotential.componentReuse,

          material_recovery:
            res.recoveryPotential.materialRecovery,

          image_url: placeholderImage,

          components:
            res.components,

          materials:
            res.materials,

          workflow:
            res.recoveryWorkflow,
        });
      } catch (saveError) {
        console.error(
          'Could not save demo scan:',
          saveError
        );
      }
    } catch (demoError) {
      console.error(
        'Demo scan error:',
        demoError
      );

      setError(
        'Could not run the demo scan.'
      );

      setPhase('idle');
    }
  };

  return (
    <div className="animate-fade-in mx-auto max-w-5xl px-4 py-12 sm:px-6">

      {/* PAGE HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">
          Scan a device
        </h1>

        <p className="mt-2 text-sm text-ink-muted">
          Place the device inside the frame and capture a clear image.
        </p>
      </div>

      {/* CAMERA / IMAGE CARD */}
      <div className="card overflow-hidden">

        <div className="relative aspect-[4/3] w-full bg-ink">

          {/* LIVE CAMERA */}
          {phase === 'camera' && (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              playsInline
              muted
            />
          )}

          {/* CAPTURED IMAGE */}
          {(phase === 'captured' ||
            phase === 'scanning') &&
            capturedUrl && (
              <img
                src={capturedUrl}
                alt="Captured device"
                className="absolute inset-0 h-full w-full object-contain bg-white"
              />
            )}

          {/* RESULT IMAGE */}
          {phase === 'result' && result && (
            <DetectionImage
              imageSrc={
                capturedUrl ??
                placeholderImage
              }
              components={result.components}
            />
          )}

          {/* CAMERA FRAME */}
          {(phase === 'idle' ||
            phase === 'camera') && (
            <div className="pointer-events-none absolute inset-6 rounded-md border-2 border-dashed border-white/25" />
          )}

          {/* SCANNING ANIMATION */}
          {phase === 'scanning' && (
            <div className="absolute inset-0 overflow-hidden">

              <div className="absolute left-0 right-0 h-0.5 bg-moss-400/80 shadow-[0_0_12px_rgba(79,130,70,0.6)] animate-scan-line" />

              <div className="absolute inset-0 flex items-center justify-center bg-ink/30">

                <span className="rounded-md bg-ink/80 px-3 py-1.5 text-sm text-paper">
                  Analyzing image…
                </span>

              </div>
            </div>
          )}
        </div>

        {/* BUTTON AREA */}
        <div className="flex flex-wrap items-center gap-3 border-t border-paper-line p-4">

          {/* IDLE */}
          {phase === 'idle' && (
            <>
              <button
                onClick={startCamera}
                className="btn-primary"
              >
                <Camera className="h-4 w-4" />
                Start Camera
              </button>

              <button
                onClick={runDemoScan}
                className="btn-ghost"
              >
                Run demo scan
              </button>
            </>
          )}

          {/* CAMERA */}
          {phase === 'camera' && (
            <>
              <button
                onClick={capture}
                className="btn-primary"
              >
                <Circle className="h-4 w-4" />
                Capture
              </button>

              <button
                onClick={() => {
                  stopCamera();
                  setPhase('idle');
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
            </>
          )}

          {/* CAPTURED */}
          {phase === 'captured' && (
            <>
              <button
                onClick={runScan}
                className="btn-primary"
              >
                <ScanLine className="h-4 w-4" />
                Scan Image
              </button>

              <button
                onClick={retake}
                className="btn-ghost"
              >
                <RefreshCw className="h-4 w-4" />
                Retake
              </button>
            </>
          )}

          {/* SCANNING */}
          {phase === 'scanning' && (
            <span className="text-sm text-ink-muted">
              Running detection…
            </span>
          )}

          {/* RESULT */}
          {phase === 'result' && (
            <>
              <button
                onClick={retake}
                className="btn-outline"
              >
                <RefreshCw className="h-4 w-4" />
                Scan another
              </button>

              <button
                onClick={() =>
                  navigate('/history')
                }
                className="btn-ghost"
              >
                View history

                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* HIDDEN CANVAS */}
      <canvas
        ref={canvasRef}
        className="hidden"
      />

      {/* ERROR */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-clay-400/30 bg-clay-400/10 px-3 py-2.5 text-sm text-clay-600">

          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />

          <span>{error}</span>

        </div>
      )}

      {/* RESULT */}
      {phase === 'result' &&
        result && (
          <ResultView
            result={result}
            onPick={setActiveComponent}
          />
        )}

      {/* COMPONENT DRAWER */}
      {activeComponent && (
        <ComponentDrawer
          component={activeComponent}
          onClose={() =>
            setActiveComponent(null)
          }
        />
      )}
    </div>
  );
}

/* =========================================================
   RESULT VIEW
========================================================= */

function ResultView({
  result,
  onPick,
}: {
  result: ScanResult;
  onPick: (c: DetectedComponent) => void;
}) {
  return (
    <div className="mt-10 animate-fade-up space-y-10">

      {/* DETECTED DEVICE */}
      <section className="card p-6">

        <div className="flex flex-wrap items-end justify-between gap-4">

          <div>
            <p className="label-eyebrow">
              Detected device
            </p>

            <h2 className="mt-1 text-xl font-semibold text-ink">
              {result.device}
            </h2>

            {result.disclaimer && (
              <p className="mt-2 max-w-md text-xs leading-relaxed text-ink-muted">
                {result.disclaimer}
              </p>
            )}
          </div>

          <div className="text-right">

            <p className="label-eyebrow">
              Confidence
            </p>

            <p className="mt-1 font-display text-2xl font-semibold text-ink">
              {result.confidence}%
            </p>

          </div>

        </div>

      </section>

      {/* COMPONENTS */}
      <section>

        <h3 className="text-lg font-semibold text-ink">
          Components found
        </h3>

        <p className="mt-1 text-sm text-ink-muted">
          Tap a component to see recovery details.
        </p>

        {result.components.length === 0 && (
          <div className="mt-4 card px-4 py-6 text-center text-sm text-ink-muted">
            No clearly identifiable components were detected in this image. Try capturing a
            closer, well-lit photo of the device.
          </div>
        )}

        <div className="mt-4 card divide-y divide-paper-line">

          {result.components.map((c) => (
            <button
              key={c.id}
              onClick={() => onPick(c)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-paper-warm"
            >

              <span className="text-sm font-medium text-ink">
                {c.name}
              </span>

              <ConfidenceBar
                value={c.confidence}
              />

            </button>
          ))}

        </div>

      </section>

      {/* MATERIAL BREAKDOWN */}
      <section>

        <h3 className="text-lg font-semibold text-ink">
          Material breakdown
        </h3>

        <p className="mt-1 text-sm text-ink-muted">
          Estimated visual classification of material categories.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">

          {result.materials.map((m) => (
            <div
              key={m.id}
              className="card flex items-center justify-between px-4 py-3"
            >

              <div>

                <p className="text-sm font-medium text-ink">
                  {m.name}
                </p>

                {m.note && (
                  <p className="text-xs text-ink-muted">
                    {m.note}
                  </p>
                )}

              </div>

              <PotentialBadge
                level={m.potential}
              />

            </div>
          ))}

        </div>

        <p className="mt-3 text-xs leading-relaxed text-ink-muted">
          Material quantities cannot be determined accurately from a normal camera image. Physical
          testing is required for exact composition.
        </p>

      </section>

      {/* RECOVERY PLAN */}
      <section>

        <h3 className="text-lg font-semibold text-ink">
          Suggested recovery path
        </h3>

        <p className="mt-1 text-sm text-ink-muted">
          A practical workflow, not an automated process.
        </p>

        <ol className="mt-4 space-y-0 card divide-y divide-paper-line">

          {result.recoveryWorkflow.map((s) => (
            <li
              key={s.step}
              className="flex gap-4 px-4 py-3.5"
            >

              <span className="font-display text-sm font-semibold text-moss-600 tabular-nums">
                {String(s.step).padStart(2, '0')}
              </span>

              <div>

                <p className="text-sm font-medium text-ink">
                  {s.title}
                </p>

                <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">
                  {s.detail}
                </p>

              </div>

            </li>
          ))}

        </ol>

      </section>

      {/* RECOVERY POTENTIAL */}
      <section className="card p-6">

        <div className="flex items-center gap-2">

          <CheckCircle2 className="h-4 w-4 text-moss-600" />

          <h3 className="text-base font-semibold text-ink">
            Recovery potential
          </h3>

        </div>

        <div className="mt-5 grid gap-6 sm:grid-cols-3">

          <SummaryStat
            label="Recovery score"
            value={`${result.recoveryPotential.score}/100`}
          />

          <SummaryStat
            label="Component reuse"
            value={`${result.recoveryPotential.componentReuse}%`}
          />

          <SummaryStat
            label="Material recovery"
            value={`${result.recoveryPotential.materialRecovery}%`}
          />

        </div>

        <p className="mt-5 border-t border-paper-line pt-4 text-xs leading-relaxed text-ink-muted">
          Based on visual classification and predefined recovery rules. These are estimates, not
          measurements.
        </p>

      </section>

    </div>
  );
}

/* =========================================================
   SUMMARY STAT
========================================================= */

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="label-eyebrow">
        {label}
      </p>

      <p className="mt-1 font-display text-2xl font-semibold text-ink">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   COMPONENT DRAWER
========================================================= */

function ComponentDrawer({
  component,
  onClose,
}: {
  component: DetectedComponent;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">

      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-ink/30 animate-fade-in"
        onClick={onClose}
      />

      {/* DRAWER */}
      <aside className="relative h-full w-full max-w-sm animate-fade-up overflow-y-auto bg-paper-card shadow-lift">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-paper-line px-5 py-4">

          <h4 className="text-base font-semibold text-ink">
            {component.name}
          </h4>

          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-muted hover:bg-paper-warm"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

        </div>

        {/* CONTENT */}
        <div className="space-y-5 px-5 py-5">

          {/* CONFIDENCE */}
          <div>

            <p className="label-eyebrow">
              Confidence
            </p>

            <div className="mt-1.5">
              <ConfidenceBar
                value={component.confidence}
              />
            </div>

          </div>

          {/* MATERIALS */}
          <div>

            <p className="label-eyebrow">
              Possible materials
            </p>

            <ul className="mt-1.5 space-y-1">

              {component.materials.map(
                (material) => (
                  <li
                    key={material}
                    className="text-sm text-ink-soft"
                  >
                    {material}
                  </li>
                )
              )}

            </ul>

          </div>

          {component.reason && (
            <div>

              <p className="label-eyebrow">
                Condition assessment
              </p>

              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                {component.reason}
              </p>

            </div>
          )}

          {/* RECOVERY METHOD */}
          <div>

            <p className="label-eyebrow">
              Recovery method
            </p>

            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              {component.recoveryMethod}
            </p>

          </div>

          {/* RECOVERY POTENTIAL */}
          <div>

            <p className="label-eyebrow">
              Recovery potential
            </p>

            <div className="mt-1.5">

              <PotentialBadge
                level={component.recoveryPotential}
              />

            </div>

          </div>

        </div>

      </aside>

    </div>
  );
}