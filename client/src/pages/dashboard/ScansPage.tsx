import { useEffect, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { Link } from "react-router";
import { analyzeImage, countHistoryItems, formatHistoryDate, getScanHistory } from "../../lib/detection";
import { updateDetectionFreshness } from "../../lib/detection";
import type {
  DetectionResult,
  FreshnessStatus,
  ScanHistoryItem,
  ScanMode,
} from "../../lib/detection";
import { getShelves } from "../../lib/shelf";
import CameraScanner from "../../components/scanner/CameraScanner";
import type { Shelf } from "../../types/shelf";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export default function ScansPage() {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [shelvesLoading, setShelvesLoading] = useState(true);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const [previewImage, setPreviewImage] = useState<File | null>(null);

  const [result, setResult] = useState<DetectionResult | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [showCamera, setShowCamera] = useState(false);
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
  const [savingDetectionId, setSavingDetectionId] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [selectedHistoryScan, setSelectedHistoryScan] = useState<ScanHistoryItem | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>("STOCK_IN");

  const { token, user } = useAuth();
  const businessId = user?.businessId;

  useEffect(() => {
    if (!token || !businessId) {
      setShelves([]);
      setShelvesLoading(false);
      return;
    }

    const loadShelves = async () => {
      try {
        setShelvesLoading(true);
        setShelves(await getShelves(token, businessId));
      } catch (error: unknown) {
        setShelves([]);
        showError(error instanceof Error ? error.message : "Failed to load shelves.");
      } finally {
        setShelvesLoading(false);
      }
    };

    loadShelves();
  }, [token, businessId]);

  useEffect(() => {
    if (!token || !businessId) {
      setScanHistory([]);
      setHistoryLoading(false);
      return;
    }

    setHistoryError("");
    getScanHistory(
      businessId,
      token,
      new Date(0).toISOString(),
      new Date().toISOString(),
    )
      .then((scans) => setScanHistory(scans.sort(
        (first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime(),
      )))
      .catch(() => {
        setScanHistory([]);
        setHistoryError("Unable to load scan history. Please check that the server is running and try again.");
      })
      .finally(() => setHistoryLoading(false));
  }, [token, businessId]);

   const showError = (message: string) => {
  setError(message);

  setTimeout(() => {
    setError("");
  }, 3000);
};

  const handleFreshnessChange = async (
    detectionId: string | undefined,
    freshness: FreshnessStatus,
  ) => {
    if (!detectionId || !token || !result) return;

    setSavingDetectionId(detectionId);
    setError("");

    try {
      await updateDetectionFreshness(detectionId, freshness, token);
      const detections = result.detections.map((detection) =>
        detection.id === detectionId
          ? { ...detection, freshness }
          : detection,
      );
      const counts = detections.reduce<DetectionResult["counts"]>((summary, detection) => {
        const key = detection.class_name;
        summary[key] ||= { fresh: 0, rotten: 0, total: 0 };
        summary[key].total += 1;
        if (detection.freshness === "Fresh") {
          summary[key].fresh += 1;
        } else {
          summary[key].rotten += 1;
        }
        return summary;
      }, {});

      setResult({ ...result, detections, counts });
    } catch (correctionError: unknown) {
      showError(
        correctionError instanceof Error
          ? correctionError.message
          : "Unable to update freshness.",
      );
    } finally {
      setSavingDetectionId(null);
    }
  };


  const analyzeSelectedImage = async (
  file: File, 
  shelf: Shelf | null
): Promise<boolean> => {

  if (!shelf) {
    showError("Please select a shelf first.");
    return false;
  }

  try {
    setLoading(true);
    setError("");

    if (!token) {
      showError("You are not authenticated.");
      return false;
    }

    const data = await analyzeImage(
      file,
      shelf,
      businessId!,
      token,
      scanMode,
    );

    setResult(data);
    return true;
  } catch (error: unknown) {

    showError(
      error instanceof Error ? error.message : "Image analysis failed."
    );  
    return false;

  } finally {
    setLoading(false);
  }
};

 
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {

   
    const file = event.target.files?.[0];

    if (!file) return;

    if (!selectedShelf) {
      showError("Please select a shelf first.");
      return;
    }

    setPreviewImage(file);
    setResult(null);

    setError("");
    
   


  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shelf scans"
        description="Capture and review AI-powered produce inspections"
        actions={
          <Button asChild>
            <Link to="/dashboard/shelves">Add shelf</Link>
          </Button>
        }
      />

      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardContent className="p-8 text-center">
          <div className="mb-4 space-y-2 text-left">
            <Label htmlFor="shelf-select">Select a Shelf</Label>
            <select
              id="shelf-select"
              className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedShelf?.id || ""}
              disabled={shelvesLoading || shelves.length === 0}
              onChange={(e) => {
                const shelf = shelves.find((s) => s.id === e.target.value);
                setSelectedShelf(shelf || null);
              }}
            >
              <option value="">
                {shelvesLoading ? "Loading shelves..." : "Select a shelf"}
              </option>
              {shelves.map((shelf) => (
                <option key={shelf.id} value={shelf.id}>
                  {shelf.name} ({shelf.category})
                </option>
              ))}
            </select>

            {!shelvesLoading && shelves.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                No shelves found. Create a shelf before starting a scan.
              </p>
            )}
          </div>

          <div className="mb-6 flex justify-center gap-3" role="group" aria-label="Inventory scan mode">
            <Button
              type="button"
              variant={scanMode === "STOCK_IN" ? "default" : "outline"}
              aria-pressed={scanMode === "STOCK_IN"}
              onClick={() => setScanMode("STOCK_IN")}
            >
              Add Stock
            </Button>
            <Button
              type="button"
              variant={scanMode === "STOCK_OUT" ? "destructive" : "outline"}
              aria-pressed={scanMode === "STOCK_OUT"}
              onClick={() => setScanMode("STOCK_OUT")}
            >
              Remove Stock
            </Button>
          </div>

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
            <Camera className="h-8 w-8 text-primary" />
          </div>

          <h2 className="mt-4 text-xl font-semibold tracking-tight">
            Scan a shelf
          </h2>

          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Use your phone camera to capture produce. Our AI will count items and
            grade freshness.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={() => {
                if (!selectedShelf) {
                  showError("Please select a shelf first.");
                  return;
                }
                setShowCamera(true);
              }}
            >
              <Camera className="h-4 w-4" />
              Open Camera
            </Button>

            <Button variant="outline" asChild>
              <label
                className="cursor-pointer"
                onClick={(e) => {
                  if (!selectedShelf) {
                    e.preventDefault();
                    showError("Please select a shelf first.");
                  }
                }}
              >
                <Upload className="h-4 w-4" />
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCamera} onOpenChange={(open) => { if (!open) setShowCamera(false); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Camera</DialogTitle>
          </DialogHeader>
          <CameraScanner
            onClose={() => setShowCamera(false)}
            onCapture={(file) => {
              setPreviewImage(file);
              setShowCamera(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {previewImage && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={URL.createObjectURL(previewImage)}
              alt="Preview"
              className="mx-auto max-h-[450px] rounded-xl"
            />

            <div className="mt-6 flex justify-center gap-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPreviewImage(null);
                  setShowCamera(true);
                }}
              >
                Retake
              </Button>

              <Button
                type="button"
                onClick={async () => {
                  if (!selectedShelf) {
                    showError("Please select a shelf first.");
                    return;
                  }

                  setSelectedImage(previewImage);
                  setResult(null);
                  setError("");

                  // FR-SCAN-004: keep the preview after a failure so Analyze acts as "retry".
                  if (await analyzeSelectedImage(previewImage, selectedShelf)) {
                    setPreviewImage(null);
                  }
                }}
              >
                Analyze
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedImage && (
        <div className="relative mx-auto w-fit overflow-hidden rounded-xl">
          <img
            src={URL.createObjectURL(selectedImage)}
            alt="Selected"
            className="mx-auto max-h-80 w-auto rounded-xl border border-border object-contain"
          />

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
                <p className="font-medium text-white">Analyzing...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <Alert
          variant="destructive"
          className="fixed right-5 top-5 z-50 w-auto shadow-lg"
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Scan Result</CardTitle>
            {selectedShelf && (
              <p className="text-sm text-muted-foreground">
                Shelf: {selectedShelf.name}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {(result.inventoryChanges ?? []).length > 0 && (
              <div className="rounded-xl border border-border bg-muted p-5">
                <p className="text-sm font-semibold">
                  {scanMode === "STOCK_OUT" ? "Stock removed" : "Stock added"}
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  {(result.inventoryChanges ?? []).map((change) => (
                    <div key={change.productId} className="flex items-center justify-between gap-4">
                      <span className="capitalize">{change.product}</span>
                      <span>
                        Current {change.currentQuantity} · Detected {change.detected} · New stock {change.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-xl border border-border bg-muted p-5">
              <p className="text-sm text-muted-foreground">Total Detected Items</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {result.total_count}
              </p>
              <p className="text-sm text-muted-foreground">
                {result.total_count === 1 ? "item" : "items"} detected
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-semibold tracking-tight">
                Detected Products
              </h3>

              <div className="space-y-4">
                {result.detections.map((detection, index) => (
                  <div
                    key={detection.id || `${detection.class_name}-${index}`}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-muted p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold capitalize">{detection.class_name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Model freshness: {detection.freshness}
                        {detection.freshness_confidence_percent
                          ? ` (${detection.freshness_confidence_percent.toFixed(0)}% confidence)`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Label className="text-muted-foreground">Correct state</Label>
                      <Select
                        value={detection.freshness}
                        disabled={!detection.id || savingDetectionId === detection.id}
                        onValueChange={(value) =>
                          handleFreshnessChange(
                            detection.id,
                            value as FreshnessStatus,
                          )
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fresh">Fresh</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Spoiled">Spoiled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}

                {Object.entries(result.counts).map(([productName, product]) => (
                  <div
                    key={productName}
                    className="rounded-xl border border-border bg-muted p-5"
                  >
                    <h4 className="text-lg font-semibold capitalize">{productName}</h4>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="mt-1 text-xl font-semibold">{product.total}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Fresh</p>
                        <p className="mt-1 text-xl font-semibold">{product.fresh}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Rotten</p>
                        <p className="mt-1 text-xl font-semibold">{product.rotten}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Scan History</h2>
            <p className="mt-1 text-sm text-muted-foreground">Today and previous scans</p>
          </div>
          <Button variant="link" asChild className="h-auto shrink-0 p-0">
            <Link to="/dashboard/scans/history">Custom date range</Link>
          </Button>
        </div>

        {historyLoading && (
          <p className="text-sm text-muted-foreground">Loading scan history...</p>
        )}
        {!historyLoading && historyError && (
          <Alert variant="destructive">
            <AlertDescription>{historyError}</AlertDescription>
          </Alert>
        )}
        {!historyLoading && !historyError && scanHistory.length === 0 && (
          <EmptyState title="No scans found." />
        )}
        {!historyLoading && scanHistory.length > 0 && (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {scanHistory.map((scan) => (
                <button
                  key={scan.id}
                  type="button"
                  onClick={() => setSelectedHistoryScan(scan)}
                  className="flex w-full flex-col gap-2 px-4 py-4 text-left transition hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{scan.shelf_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {scan.scan_mode === "STOCK_OUT" ? "Stock Out" : "Stock In"} · {scan.item_count} item{scan.item_count === 1 ? "" : "s"} · Fresh {scan.fresh_count} · Medium {scan.medium_count} · Spoiled {scan.spoiled_count}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{scan.status}</span>
                    <span>{formatHistoryDate(scan.created_at)}</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog
        open={!!selectedHistoryScan}
        onOpenChange={(open) => { if (!open) setSelectedHistoryScan(null); }}
      >
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {selectedHistoryScan && (
            <>
              <DialogHeader>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Scan details
                </p>
                <DialogTitle className="text-2xl">
                  {selectedHistoryScan.shelf_name}
                </DialogTitle>
                <DialogDescription>
                  {formatHistoryDate(selectedHistoryScan.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-muted-foreground">Status</p>
                  <p className="mt-1 font-semibold">{selectedHistoryScan.status}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-muted-foreground">Items</p>
                  <p className="mt-1 font-semibold">{selectedHistoryScan.item_count}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-muted-foreground">Fresh</p>
                  <p className="mt-1 font-semibold">{selectedHistoryScan.fresh_count}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-muted-foreground">Spoiled</p>
                  <p className="mt-1 font-semibold">{selectedHistoryScan.spoiled_count}</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold tracking-tight">Detected items</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(countHistoryItems(selectedHistoryScan.items)).map(
                  ([type, count]) => (
                    <Badge key={type} variant="success">
                      {type}: {count}
                    </Badge>
                  ),
                )}
              </div>
              <div className="divide-y divide-border rounded-xl border border-border">
                {selectedHistoryScan.items.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground">No detected items.</p>
                )}
                {selectedHistoryScan.items.map((item, index) => (
                  <div
                    key={`${selectedHistoryScan.id}-${item.type}-${index}`}
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
