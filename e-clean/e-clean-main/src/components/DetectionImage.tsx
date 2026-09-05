import { useState } from 'react';
import type { DetectedComponent } from '@/lib/types';

interface Props {
  imageSrc: string;
  components: DetectedComponent[];
  aspect?: string;
}

export default function DetectionImage({
  imageSrc,
  components,
  aspect = 'aspect-[4/3]',
}: Props) {
  const [active, setActive] = useState<string | null>(null);

  const labelColors: Record<string, string> = {
    pcb: 'border-moss-500 text-moss-700',
    ic: 'border-ink text-ink',
    usb: 'border-clay-500 text-clay-600',
    headers: 'border-moss-400 text-moss-600',
    caps: 'border-ink-muted text-ink-muted',
    resistors: 'border-ink-muted text-ink-muted',
    leds: 'border-clay-400 text-clay-600',
    crystal: 'border-ink-soft text-ink-soft',
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg border border-paper-line bg-white ${aspect}`}
    >
      {/* Arduino image */}
      <img
        key={imageSrc}
        src={imageSrc}
        alt="Scanned Arduino device"
        className="absolute inset-0 h-full w-full object-contain bg-white"
      />

      {/* Detection boxes */}
      {components.map((c) => {
        const isActive = active === c.id;
        const color =
          labelColors[c.id] ?? 'border-ink text-ink';

        return (
          <button
            key={c.id}
            onClick={() =>
              setActive((a) => (a === c.id ? null : c.id))
            }
            style={{
              left: `${c.box.x}%`,
              top: `${c.box.y}%`,
              width: `${c.box.w}%`,
              height: `${c.box.h}%`,
            }}
            className={`group absolute rounded-sm border-2 transition-all ${
              isActive
                ? `border-solid ${color} bg-white/5`
                : 'border-white/40 hover:border-white/70'
            }`}
            aria-label={c.name}
          >
            <span
              className={`absolute -top-6 left-0 whitespace-nowrap rounded-sm border bg-paper-card px-1.5 py-0.5 text-[10px] font-medium shadow-card transition-opacity ${
                isActive
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100'
              } ${color}`}
            >
              {c.name.split(' ')[0]} {c.confidence}%
            </span>
          </button>
        );
      })}
    </div>
  );
}