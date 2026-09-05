import { Recycle } from 'lucide-react';
import { useRouter } from '@/lib/router';

export default function Footer() {
  const { navigate } = useRouter();
  return (
    <footer className="mt-24 border-t border-paper-line bg-paper-warm">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
          <div className="max-w-sm">
            <button onClick={() => navigate('/')} className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-moss-300">
                <Recycle className="h-3.5 w-3.5" />
              </span>
              <span className="font-display text-sm font-semibold text-ink">ReCircuit</span>
            </button>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Making e-waste recovery easier to understand. A visual starting point — not a
              replacement for physical material testing.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <p className="label-eyebrow">Navigate</p>
            <button onClick={() => navigate('/scan')} className="text-left text-ink-soft hover:text-ink">Scan</button>
            <button onClick={() => navigate('/recovery')} className="text-left text-ink-soft hover:text-ink">Recovery</button>
            <button onClick={() => navigate('/history')} className="text-left text-ink-soft hover:text-ink">History</button>
            <button onClick={() => navigate('/about')} className="text-left text-ink-soft hover:text-ink">About</button>
          </div>
        </div>
        <div className="mt-8 border-t border-paper-line pt-6 text-xs text-ink-muted">
          ReCircuit is a prototype. Material quantities cannot be determined accurately from a
          normal camera image — physical testing is required for exact composition.
        </div>
      </div>
    </footer>
  );
}
