import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Clock3 } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { countHistoryItems, formatHistoryDate, getScanHistory, type ScanHistoryItem } from "@/lib/detection";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

const statusVariant: Record<ScanHistoryItem["status"], "warning" | "info" | "success" | "destructive"> = {
  PENDING: "warning",
  PROCESSING: "info",
  COMPLETED: "success",
  FAILED: "destructive",
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
        <Link to="/dashboard/scans" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to scans
        </Link>
        <PageHeader
          className="mt-4 mb-0"
          title="Scan history"
          description="Review completed and in-progress scans by date."
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Choose a date range</CardTitle>
              <CardDescription className="mt-1">By default, showing the past 24 hours.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="start-date">From</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date">To</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
            <Button type="submit">Show history</Button>
          </form>
          {error && (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Scans</h2>
            <p className="mt-1 text-sm text-muted-foreground">{scans.length} scan{scans.length === 1 ? "" : "s"} found</p>
          </div>
          <Clock3 className="h-5 w-5 text-muted-foreground" />
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading scan history...</p>}
        {!loading && scans.length === 0 && (
          <EmptyState title="No scans found for this date range." />
        )}
        {!loading && scans.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="hidden grid-cols-[minmax(0,1fr)_auto_auto] gap-4 border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
                <span>Shelf and results</span><span>Status</span><span>Time</span>
              </div>
              <div className="divide-y divide-border">
                {scans.map((scan) => (
                  <button
                    key={scan.id}
                    type="button"
                    onClick={() => setSelectedScan(scan)}
                    className="grid w-full gap-2 px-5 py-4 text-left transition hover:bg-muted sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{scan.shelf_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {scan.item_count} item{scan.item_count === 1 ? "" : "s"} · Fresh {scan.fresh_count} · Medium {scan.medium_count} · Spoiled {scan.spoiled_count}
                      </p>
                    </div>
                    <Badge variant={statusVariant[scan.status]}>{scan.status}</Badge>
                    <span className="text-sm text-muted-foreground">{formatHistoryDate(scan.created_at)}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <Dialog
        open={!!selectedScan}
        onOpenChange={(open) => { if (!open) setSelectedScan(null); }}
      >
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {selectedScan && (
            <>
              <DialogHeader>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Scan details
                </p>
                <DialogTitle className="text-2xl">{selectedScan.shelf_name}</DialogTitle>
                <DialogDescription>{formatHistoryDate(selectedScan.created_at)}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-muted-foreground">Status</p>
                  <p className="mt-1 font-semibold">{selectedScan.status}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-muted-foreground">Items</p>
                  <p className="mt-1 font-semibold">{selectedScan.item_count}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-muted-foreground">Fresh</p>
                  <p className="mt-1 font-semibold">{selectedScan.fresh_count}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-muted-foreground">Spoiled</p>
                  <p className="mt-1 font-semibold">{selectedScan.spoiled_count}</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold tracking-tight">Detected items</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(countHistoryItems(selectedScan.items)).map(([type, count]) => (
                  <Badge key={type} variant="success">
                    {type}: {count}
                  </Badge>
                ))}
              </div>
              <div className="divide-y divide-border rounded-xl border border-border">
                {selectedScan.items.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground">No detected items.</p>
                )}
                {selectedScan.items.map((item, index) => (
                  <div
                    key={`${selectedScan.id}-${item.type}-${index}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                  >
                    <span className="font-medium capitalize">{item.type}</span>
                    <Badge variant="secondary">{item.freshness}</Badge>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
