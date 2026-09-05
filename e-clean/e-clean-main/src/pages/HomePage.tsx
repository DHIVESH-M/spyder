import { Camera, ArrowRight, ScanLine, Eye, Recycle } from 'lucide-react';
import { useRouter } from '@/lib/router';

const heroImage =
  'https://images.pexels.com/photos/163125/board-printed-circuit-board-computer-electronics-163125.jpeg?auto=compress&cs=tinysrgb&w=1200';

const steps = [
  {
    n: '01',
    icon: ScanLine,
    title: 'Scan',
    body: 'Place an electronic device in front of your camera.',
  },
  {
    n: '02',
    icon: Eye,
    title: 'Identify',
    body: 'The system identifies the device and visible components.',
  },
  {
    n: '03',
    icon: Recycle,
    title: 'Recover',
    body: 'Get a practical breakdown of possible materials and recovery routes.',
  },
];

export default function HomePage() {
  const { navigate } = useRouter();

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="animate-fade-up">
            <span className="label-eyebrow">E-waste recovery, made readable</span>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-ink sm:text-4xl lg:text-[2.75rem]">
              Understand what's inside your e-waste.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft">
              Scan an electronic device and get a visual breakdown of its components, material
              categories and possible recovery paths.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => navigate('/scan')} className="btn-primary">
                <Camera className="h-4 w-4" />
                Scan a Device
              </button>
              <button onClick={() => navigate('/about')} className="btn-outline">
                How it works
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-5 text-xs text-ink-muted">
              Visual classification only. Not a substitute for physical material testing.
            </p>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="relative overflow-hidden rounded-lg border border-paper-line shadow-lift">
              <img
                src={heroImage}
                alt="A printed circuit board with microchips and capacitors"
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-3 left-3 rounded-md bg-ink/80 px-2.5 py-1.5 text-xs text-paper backdrop-blur-sm">
                PCB · detected visually
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-28">
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-ink sm:text-2xl">How ReCircuit works</h2>
          <p className="mt-2 text-sm text-ink-muted">Three steps, from device to recovery plan.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="card p-6">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-semibold text-moss-600">{s.n}</span>
                <s.icon className="h-5 w-5 text-ink-muted" strokeWidth={1.75} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quiet closing band */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-lg border border-paper-line bg-paper-warm px-6 py-8 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-base font-semibold text-ink">Ready to scan your first device?</h3>
            <p className="mt-1 text-sm text-ink-muted">
              All you need is a camera. Results are estimates based on visual classification.
            </p>
          </div>
          <button onClick={() => navigate('/scan')} className="btn-primary whitespace-nowrap">
            <ScanLine className="h-4 w-4" />
            Start scanning
          </button>
        </div>
      </section>
    </div>
  );
}
