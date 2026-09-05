import type { ConfidenceLevel } from '@/lib/types';

const styles: Record<ConfidenceLevel, string> = {
  High: 'bg-moss-100 text-moss-700 border-moss-200',
  Medium: 'bg-clay-400/15 text-clay-600 border-clay-400/30',
  Low: 'bg-paper-warm text-ink-muted border-paper-line',
  Possible: 'bg-paper-warm text-ink-soft border-paper-line',
};

export default function PotentialBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${styles[level]}`}
    >
      {level} potential
    </span>
  );
}
