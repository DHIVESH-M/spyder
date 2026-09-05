import { Check, AlertTriangle, ScanLine } from 'lucide-react';
import { useRouter } from '@/lib/router';

const capabilities = [
  'Identifies electronic devices',
  'Detects visible components',
  'Groups materials into recovery categories',
  'Suggests practical recovery steps',
];

export default function AboutPage() {
  const { navigate } = useRouter();

  return (
    <div className="animate-fade-in mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <span className="label-eyebrow">About</span>
        <h1 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl">Why ReCircuit?</h1>
      </div>

      <div className="space-y-6 text-base leading-relaxed text-ink-soft">
        <p>
          Electronic waste contains valuable components and materials, but identifying what can be
          reused or recovered is often difficult without technical knowledge. ReCircuit uses
          computer vision to provide a simple visual starting point for understanding electronic
          waste.
        </p>
        <p>
          The goal is not to replace material testing or professional recycling — it is to make the
          first step, understanding what is in front of you, a little easier.
        </p>
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-ink">What ReCircuit does</h2>
        <ul className="mt-4 space-y-2.5">
          {capabilities.map((c) => (
            <li key={c} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-moss-100 text-moss-700">
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </span>
              <span className="text-sm text-ink-soft">{c}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">What ReCircuit does not do</h2>
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-clay-400/30 bg-clay-400/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-clay-600" />
          <p className="text-sm leading-relaxed text-ink-soft">
            ReCircuit does not replace physical material testing. It cannot measure exact metal
            quantities or material composition from a normal camera image. Any numbers shown are
            estimates based on visual classification and predefined recovery rules.
          </p>
        </div>
      </section>

      <section className="mt-12 rounded-lg border border-paper-line bg-paper-warm p-6">
        <h3 className="text-base font-semibold text-ink">A note on the data</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Results use labels like <span className="font-medium text-ink-soft">Detected visually</span>,{' '}
          <span className="font-medium text-ink-soft">Estimated</span>,{' '}
          <span className="font-medium text-ink-soft">Possible</span> and{' '}
          <span className="font-medium text-ink-soft">Requires physical testing</span>. ReCircuit
          will never present a guess as a precise measurement.
        </p>
      </section>

      <div className="mt-12">
        <button onClick={() => navigate('/scan')} className="btn-primary">
          <ScanLine className="h-4 w-4" />
          Try a scan
        </button>
      </div>
    </div>
  );
}
