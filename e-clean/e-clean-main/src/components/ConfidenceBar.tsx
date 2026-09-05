export default function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 90 ? 'bg-moss-500' : value >= 80 ? 'bg-moss-400' : value >= 70 ? 'bg-clay-500' : 'bg-ink-muted';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-paper-line">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums text-ink-muted">{value}%</span>
    </div>
  );
}
