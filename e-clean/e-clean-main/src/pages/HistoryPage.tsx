import { useEffect, useState } from 'react';
import { FileText, Trash2, AlertCircle, ArrowRight } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { listScans, deleteScan } from '@/lib/supabaseClient';
import type { ScanRecord } from '@/lib/types';

export default function HistoryPage() {
  const { navigate } = useRouter();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setLoading(true);
    listScans()
      .then(setScans)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteScan(id);
      setScans((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setFailed(true);
    }
  };

  return (
    <div className="animate-fade-in mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">History</h1>
        <p className="mt-2 text-sm text-ink-muted">Past scans and their recovery scores.</p>
      </div>

      {loading && <p className="text-sm text-ink-muted">Loading…</p>}

      {failed && (
        <div className="flex items-start gap-2 rounded-md border border-clay-400/30 bg-clay-400/10 px-3 py-2.5 text-sm text-clay-600">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>Could not load history. If you just scanned a device, give it a moment and refresh.</span>
        </div>
      )}

      {!loading && !failed && scans.length === 0 && (
        <div className="card p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-ink-muted" strokeWidth={1.5} />
          <p className="mt-3 text-sm text-ink-soft">No scans recorded yet.</p>
          <button onClick={() => navigate('/scan')} className="btn-primary mt-5">
            Scan your first device
          </button>
        </div>
      )}

      {!loading && !failed && scans.length > 0 && (
        <div className="card divide-y divide-paper-line">
          {scans.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
              <div className="flex items-center gap-4">
                {s.image_url && (
                  <img
                    src={s.image_url}
                    alt={s.device_name}
                    className="h-12 w-12 rounded-md border border-paper-line object-cover"
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-ink">{s.device_name}</p>
                  <p className="text-xs text-ink-muted">
                    {formatDate(s.created_at)} · {s.recovery_score} recovery score
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/report/${s.id}`)}
                  className="btn-outline"
                >
                  View Report
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="rounded-md p-2 text-ink-muted hover:bg-paper-warm hover:text-clay-600"
                  aria-label="Delete scan"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
