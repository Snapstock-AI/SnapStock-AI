import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Clock3, X } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { countHistoryItems, formatHistoryDate, getScanHistory, type ScanHistoryItem } from "@/lib/detection";

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rangeDate(value: string, endOfDay = false) {
  const date = new Date(`${value}T00:00:00`);
  if (endOfDay) date.setDate(date.getDate() + 1);
  return date.toISOString();
}

const statusStyles: Record<ScanHistoryItem["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  PROCESSING: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  COMPLETED: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export default function ScanHistoryPage() {
  const { token, user } = useAuth();
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const [startDate, setStartDate] = useState(dateInputValue(yesterday));
  const [endDate, setEndDate] = useState(dateInputValue(today));
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedScan, setSelectedScan] = useState<ScanHistoryItem | null>(null);

  async function loadHistory(start = startDate, end = endDate) {
    if (!token || !user?.businessId) return;

    setLoading(true);
    setError("");
    try {
      setScans(
        await getScanHistory(
          user.businessId,
          token,
          rangeDate(start),
          rangeDate(end, true),
        ),
      );
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load scan history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [token, user?.businessId]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (startDate > endDate) {
      setError("Start date must be before end date.");
      return;
    }
    loadHistory();
  }

  return (
    <div className="space-y-7">
      <div>
        <Link to="/dashboard/scans" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to scans
        </Link>
        <h1 className="mt-4 font-serif text-2xl font-semibold md:text-3xl">Scan history</h1>
        <p className="mt-1 text-sm text-muted">Review completed and in-progress scans by date.</p>
      </div>

      <section className="rounded-2xl border border-border bg-surface-elevated p-5 md:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-medium">Choose a date range</h2>
            <p className="mt-1 text-sm text-muted">By default, showing the past 24 hours.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-sm">
            <span className="mb-1.5 block text-muted">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-muted">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </label>
          <button type="submit" className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            Show history
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold">Scans</h2>
            <p className="mt-1 text-sm text-muted">{scans.length} scan{scans.length === 1 ? "" : "s"} found</p>
          </div>
          <Clock3 className="h-5 w-5 text-muted" />
        </div>

        {loading && <p className="text-sm text-muted">Loading scan history...</p>}
        {!loading && scans.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
            No scans found for this date range.
          </div>
        )}
        {!loading && scans.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated">
            <div className="hidden grid-cols-[minmax(0,1fr)_auto_auto] gap-4 border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted sm:grid">
              <span>Shelf and results</span><span>Status</span><span>Time</span>
            </div>
            <div className="divide-y divide-border">
              {scans.map((scan) => (
                <button key={scan.id} type="button" onClick={() => setSelectedScan(scan)} className="grid w-full gap-2 px-5 py-4 text-left transition hover:bg-surface-muted sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4">
                  <div>
                    <p className="text-sm font-medium">{scan.shelf_name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {scan.item_count} item{scan.item_count === 1 ? "" : "s"} · Fresh {scan.fresh_count} · Medium {scan.medium_count} · Spoiled {scan.spoiled_count}
                    </p>
                  </div>
                  <span className={`w-fit rounded-lg px-2.5 py-1 text-xs font-medium ${statusStyles[scan.status]}`}>
                    {scan.status}
                  </span>
                  <span className="text-sm text-muted">{formatHistoryDate(scan.created_at)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {selectedScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="history-scan-details-title">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface-elevated p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Scan details</p>
                <h2 id="history-scan-details-title" className="mt-1 font-serif text-2xl font-semibold">{selectedScan.shelf_name}</h2>
                <p className="mt-1 text-sm text-muted">{formatHistoryDate(selectedScan.created_at)}</p>
              </div>
              <button type="button" onClick={() => setSelectedScan(null)} className="rounded-full p-2 text-muted hover:bg-surface-muted hover:text-foreground" aria-label="Close scan details">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-xl bg-surface-muted p-3"><p className="text-muted">Status</p><p className="mt-1 font-semibold">{selectedScan.status}</p></div>
              <div className="rounded-xl bg-surface-muted p-3"><p className="text-muted">Items</p><p className="mt-1 font-semibold">{selectedScan.item_count}</p></div>
              <div className="rounded-xl bg-surface-muted p-3"><p className="text-muted">Fresh</p><p className="mt-1 font-semibold">{selectedScan.fresh_count}</p></div>
              <div className="rounded-xl bg-surface-muted p-3"><p className="text-muted">Spoiled</p><p className="mt-1 font-semibold">{selectedScan.spoiled_count}</p></div>
            </div>
            <h3 className="mt-6 font-serif text-lg font-semibold">Detected items</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(countHistoryItems(selectedScan.items)).map(([type, count]) => (
                <span key={type} className="rounded-lg bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                  {type}: {count}
                </span>
              ))}
            </div>
            <div className="mt-3 divide-y divide-border rounded-xl border border-border">
              {selectedScan.items.length === 0 && <p className="p-4 text-sm text-muted">No detected items.</p>}
              {selectedScan.items.map((item, index) => (
                <div key={`${selectedScan.id}-${item.type}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span className="font-medium capitalize">{item.type}</span>
                  <span className="rounded-lg bg-surface-muted px-2.5 py-1 text-xs text-muted">{item.freshness}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
