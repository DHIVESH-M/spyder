import { useEffect, useState } from 'react';
import { Cpu, Recycle, Boxes, Layers, AlertCircle } from 'lucide-react';
import { listScans } from '@/lib/supabaseClient';
import type { ScanRecord } from '@/lib/types';

export default function RecoveryPage() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    listScans()
      .then(setScans)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const stats = computeStats(scans);

  return (
    <div className="animate-fade-in mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Recovery analysis</h1>
        <p className="mt-2 text-sm text-ink-muted">
          An overview of what has been scanned and classified so far.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Cpu} label="Devices scanned" value={stats.devices} />
        <StatCard icon={Boxes} label="Components identified" value={stats.components} />
        <StatCard icon={Recycle} label="Potentially reusable parts" value={stats.reusable} />
        <StatCard icon={Layers} label="Material categories detected" value={stats.materialCats} />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">Recovery score by device</h2>
        <p className="mt-1 text-sm text-ink-muted">Estimated from visual classification.</p>
        <div className="mt-4 card p-6">
          {loading && <p className="text-sm text-ink-muted">Loading scans…</p>}
          {failed && (
            <div className="flex items-start gap-2 text-sm text-clay-600">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>Could not load scan history. Try scanning a device first.</span>
            </div>
          )}
          {!loading && !failed && scans.length === 0 && (
            <p className="text-sm text-ink-muted">
              No scans yet. Head to the Scan page to capture your first device.
            </p>
          )}
          {!loading && !failed && scans.length > 0 && (
            <div className="space-y-4">
              {scans.map((s) => (
                <div key={s.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{s.device_name}</span>
                    <span className="tabular-nums text-ink-muted">{s.recovery_score}/100</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-paper-line">
                    <div
                      className="h-full rounded-full bg-moss-500"
                      style={{ width: `${s.recovery_score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <p className="mt-8 text-xs leading-relaxed text-ink-muted">
        These figures are aggregated from visual classifications and predefined recovery rules.
        They are estimates, not measurements of actual recovered material.
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Cpu;
  label: string;
  value: number | string;
}) {
  return (
    <div className="card p-5">
      <Icon className="h-5 w-5 text-moss-600" strokeWidth={1.75} />
      <p className="mt-4 font-display text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{label}</p>
    </div>
  );
}

function computeStats(scans: ScanRecord[]) {
  const devices = scans.length;
  const components = scans.reduce((acc, s) => acc + (s.components?.length ?? 0), 0);
  const reusable = scans.reduce(
    (acc, s) =>
      acc +
      (s.components?.filter((c) => c.recoveryPotential === 'High' || c.recoveryPotential === 'Medium')
        .length ?? 0),
    0,
  );
  const materialCats = new Set<string>();
  scans.forEach((s) => s.materials?.forEach((m) => materialCats.add(m.id)));
  return { devices, components, reusable, materialCats: materialCats.size };
}
