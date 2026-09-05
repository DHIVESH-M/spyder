import { useEffect, useState } from 'react';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { getScan } from '@/lib/supabaseClient';
import type { ScanRecord, DetectedComponent } from '@/lib/types';
import DetectionImage from '@/components/DetectionImage';
import ConfidenceBar from '@/components/ConfidenceBar';
import PotentialBadge from '@/components/PotentialBadge';

export default function ReportPage() {
  const { route, navigate } = useRouter();
  const id = route.params.id;
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState<DetectedComponent | null>(null);

  useEffect(() => {
    if (!id) return;
    getScan(id)
      .then((s) => setScan(s))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-16 text-sm text-ink-muted">Loading report…</div>;

  if (failed || !scan) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="flex items-start gap-2 rounded-md border border-clay-400/30 bg-clay-400/10 px-3 py-2.5 text-sm text-clay-600">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>Could not load this report. It may have been deleted.</span>
        </div>
        <button onClick={() => navigate('/history')} className="btn-ghost mt-4">
          <ArrowLeft className="h-4 w-4" />
          Back to history
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <button onClick={() => navigate('/history')} className="btn-ghost mb-6 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        History
      </button>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <p className="label-eyebrow">Detected device</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">{scan.device_name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Scanned {new Date(scan.created_at).toLocaleString()} · {scan.confidence}% confidence
          </p>

          <div className="mt-5">
            {scan.image_url && (
              <DetectionImage imageSrc={scan.image_url} components={scan.components ?? []} />
            )}
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold text-ink">Components found</h3>
            <div className="mt-3 card divide-y divide-paper-line">
              {(scan.components ?? []).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActive((a) => (a?.id === c.id ? null : c))}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-paper-warm"
                >
                  <span className="text-sm font-medium text-ink">{c.name}</span>
                  <ConfidenceBar value={c.confidence} />
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-ink">Material breakdown</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(scan.materials ?? []).map((m) => (
                <div key={m.id} className="card flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{m.name}</p>
                    {m.note && <p className="text-xs text-ink-muted">{m.note}</p>}
                  </div>
                  <PotentialBadge level={m.potential} />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-ink">Suggested recovery path</h3>
            <ol className="mt-3 card divide-y divide-paper-line">
              {(scan.workflow ?? []).map((s) => (
                <li key={s.step} className="flex gap-4 px-4 py-3.5">
                  <span className="font-display text-sm font-semibold text-moss-600 tabular-nums">
                    {String(s.step).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">{s.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="card p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-moss-600" />
              <h3 className="text-base font-semibold text-ink">Recovery potential</h3>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-4">
              <Stat label="Score" value={`${scan.recovery_score}/100`} />
              <Stat label="Reuse" value={`${scan.component_reuse}%`} />
              <Stat label="Material" value={`${scan.material_recovery}%`} />
            </div>
            <p className="mt-4 border-t border-paper-line pt-3 text-xs leading-relaxed text-ink-muted">
              Based on visual classification and predefined recovery rules.
            </p>
          </section>
        </div>
      </div>

      {active && <ComponentPanel component={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-eyebrow">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function ComponentPanel({
  component,
  onClose,
}: {
  component: DetectedComponent;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/30 animate-fade-in" onClick={onClose} />
      <aside className="relative h-full w-full max-w-sm animate-fade-up overflow-y-auto bg-paper-card shadow-lift">
        <div className="flex items-center justify-between border-b border-paper-line px-5 py-4">
          <h4 className="text-base font-semibold text-ink">{component.name}</h4>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-muted hover:bg-paper-warm">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 px-5 py-5">
          <div>
            <p className="label-eyebrow">Confidence</p>
            <div className="mt-1.5">
              <ConfidenceBar value={component.confidence} />
            </div>
          </div>
          <div>
            <p className="label-eyebrow">Possible materials</p>
            <ul className="mt-1.5 space-y-1">
              {component.materials.map((m) => (
                <li key={m} className="text-sm text-ink-soft">{m}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label-eyebrow">Recovery method</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{component.recoveryMethod}</p>
          </div>
          <div>
            <p className="label-eyebrow">Recovery potential</p>
            <div className="mt-1.5">
              <PotentialBadge level={component.recoveryPotential} />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
