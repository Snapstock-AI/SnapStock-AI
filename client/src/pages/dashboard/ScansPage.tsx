import { useEffect, useState } from "react";
import { Camera, Plus, Upload } from "lucide-react";
import { Link } from "react-router";
import {
  analyzeImage,
  formatHistoryDate,
  getScanHistory,
  type DetectionResult,
  type ScanHistoryItem,
  type ScanMode,
} from "../../lib/detection";
import CameraScanner from "../../components/scanner/CameraScanner";
import type { Shelf } from "../../types/shelf";
import { getShelves, createShelf } from "../../lib/shelf";
import ShelfModal from "../../components/shelf/ShelfModal";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function ScansPage() {
  const { token, user } = useAuth();

  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loadingShelves, setLoadingShelves] = useState(false);
  const [showShelfModal, setShowShelfModal] = useState(false);
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);

  const [recentScans, setRecentScans] = useState<ScanHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<File | null>(null);
  const [result, setResult] = useState<(DetectionResult & { shelf?: Shelf }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [scanMode, setScanMode] = useState<ScanMode>("STOCK_IN");

  const [showCamera, setShowCamera] = useState(false);

  // Fetch shelves for current business
  useEffect(() => {
    if (!token || !user?.businessId) {
      return;
    }

    let isCancelled = false;
    setLoadingShelves(true);

    getShelves(token, user.businessId)
      .then((data) => {
        if (!isCancelled) {
          setShelves(data);
          setSelectedShelf((prev) => {
            if (!prev) return null;
            return data.find((s) => s.id === prev.id) || null;
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load shelves:", err);
      })
      .finally(() => {
        if (!isCancelled) {
          setLoadingShelves(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [token, user?.businessId]);

  // Fetch recent scan history
  const loadRecentHistory = async () => {
    if (!token || !user?.businessId) return;
    try {
      setLoadingHistory(true);
      const history = await getScanHistory(user.businessId, token);
      setRecentScans(history.slice(0, 5));
    } catch {
      // ignore history load error on main scans page
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadRecentHistory();
  }, [token, user?.businessId]);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => {
      setError("");
    }, 4000);
  };

  const handleShelfSubmit = async (shelfData: Shelf): Promise<void> => {
    if (!token) {
      throw new Error("You are not authenticated.");
    }
    if (!user?.businessId) {
      throw new Error("Your account is not connected to a business.");
    }

    const newShelf = await createShelf(
      shelfData.name,
      shelfData.category,
      token,
      user.businessId,
    );

    setShelves((prev) => [...prev, newShelf]);
    setSelectedShelf(newShelf);
    setShowShelfModal(false);
  };

  const analyzeSelectedImage = async (
    file: File,
    shelf: Shelf | null,
  ) => {
    if (!shelf) {
      showError("Please select a shelf first.");
      return;
    }

    if (!user?.businessId) {
      showError("Your account is not connected to a business.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (!token) {
        showError("You are not authenticated.");
        return;
      }

      const data = await analyzeImage(
        file,
        shelf,
        user.businessId,
        token,
        scanMode,
      );

      setResult({ ...data, shelf });
      void loadRecentHistory();
    } catch (err: any) {
      showError(err.message || "Image analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
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
      <div>
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">
          Shelf scans
        </h1>
        <p className="mt-1 text-sm text-muted">
          Capture and review AI-powered produce inspections
        </p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-8 text-center dark:border-brand-800 dark:bg-brand-900/20">
        <div className="mb-6 mx-auto max-w-md text-left">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="shelf-select" className="font-serif text-sm font-semibold">
              Select a Shelf <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowShelfModal(true)}
                className="h-7 px-2 text-xs font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-100/50 dark:hover:bg-brand-900/40"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Shelf
              </Button>
              <Link
                to="/dashboard/shelves"
                className="text-xs text-muted hover:text-foreground hover:underline"
              >
                Manage
              </Link>
            </div>
          </div>

          <select
            id="shelf-select"
            value={selectedShelf?.id || ""}
            onChange={(e) => {
              if (e.target.value === "__new__") {
                setShowShelfModal(true);
                return;
              }
              const shelf = shelves.find((s) => s.id === e.target.value);
              setSelectedShelf(shelf || null);
            }}
            disabled={loadingShelves}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm shadow-sm transition hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
          >
            <option value="">
              {loadingShelves
                ? "Loading shelves..."
                : shelves.length === 0
                ? "No shelves available — click 'Add Shelf' first"
                : "-- Select a Shelf --"}
            </option>

            {shelves.map((shelf) => (
              <option key={shelf.id} value={shelf.id}>
                {shelf.name} {shelf.category ? `(${shelf.category})` : ""}
              </option>
            ))}

            <option value="__new__">+ Create new shelf...</option>
          </select>

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium">Scan mode</p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Scan mode">
              {([
                ["STOCK_IN", "Stock in"],
                ["STOCK_OUT", "Stock out"],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={scanMode === mode}
                  onClick={() => setScanMode(mode)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    scanMode === mode
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-border bg-surface hover:bg-surface-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {shelves.length === 0 && !loadingShelves && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between">
              <span>No shelves found for your business.</span>
              <button
                type="button"
                onClick={() => setShowShelfModal(true)}
                className="font-semibold underline ml-1 hover:text-amber-700"
              >
                Create one now
              </button>
            </p>
          )}
        </div>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50">
          <Camera className="h-8 w-8 text-brand-600 dark:text-brand-400" />
        </div>

        <h2 className="mt-4 font-serif text-xl font-semibold">
          Scan a shelf
        </h2>

        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Use your phone camera to capture produce. Our AI will count items and
          grade freshness.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              if (!selectedShelf) {
                showError("Please select a shelf first.");
                return;
              }
              setShowCamera(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Camera className="h-4 w-4" />
            Open Camera
          </button>

          <label
            onClick={(e) => {
              if (!selectedShelf) {
                e.preventDefault();
                showError("Please select a shelf first.");
              }
            }}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold hover:bg-surface-muted"
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
        </div>
      </div>

      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-surface-elevated p-6">
            <h2 className="mb-4 text-xl font-semibold">
              Camera
            </h2>
            <CameraScanner
              onClose={() => setShowCamera(false)}
              onCapture={(file) => {
                setPreviewImage(file);
                setShowCamera(false);
              }}
            />
          </div>
        </div>
      )}

      {previewImage && (
        <div className="rounded-2xl border border-border bg-surface-elevated p-6">
          <h2 className="mb-4 text-xl font-semibold">
            Preview
          </h2>
          <img
            src={URL.createObjectURL(previewImage)}
            alt="Preview"
            className="mx-auto max-h-[450px] rounded-xl"
          />
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => {
                setPreviewImage(null);
                setShowCamera(true);
              }}
              className="rounded-full bg-gray-500 px-6 py-3 font-semibold text-white hover:bg-gray-600"
            >
              Retake
            </button>

            <button
              onClick={async () => {
                if (!selectedShelf) {
                  showError("Please select a shelf first.");
                  return;
                }

                setSelectedImage(previewImage);
                setResult(null);
                setError("");

                await analyzeSelectedImage(previewImage, selectedShelf);
                setPreviewImage(null);
              }}
              className="rounded-full bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-600"
            >
              Analyze
            </button>
          </div>
        </div>
      )}

      {selectedImage && (
        <div className="relative mx-auto w-fit rounded-xl overflow-hidden">
          <img
            src={URL.createObjectURL(selectedImage)}
            alt="Selected"
            className="mx-auto max-h-80 w-auto rounded-xl border border-border object-contain"
          />

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
                <p className="font-medium text-white">
                  Analyzing scan...
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {error && (
          <div className="fixed top-5 right-5 z-50 rounded-xl border border-red-300 bg-red-50 px-5 py-3 text-red-700 shadow-lg animate-in slide-in-from-right">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="rounded-2xl border border-border bg-surface-elevated p-6">
          <h2 className="font-serif text-xl font-semibold">
            Scan Result
          </h2>

          {result.shelf && (
            <p className="mt-2 text-sm text-muted">
              Shelf: {result.shelf.name}
            </p>
          )}

          <div className="mt-6 rounded-2xl border border-border bg-surface-muted p-5">
            <p className="text-sm text-muted">
              Total Detected Items
            </p>
            <p className="mt-2 font-serif text-3xl font-semibold">
              {result.total_count}
            </p>
            <p className="text-sm text-muted">
              {result.total_count === 1 ? "item" : "items"} detected
            </p>
          </div>

          <div className="mt-6">
            <h3 className="mb-4 font-serif text-lg font-semibold">
              Detected Products
            </h3>

            <div className="space-y-4">
              {Object.entries(result.counts).map(([productName, product]) => {
                const displayProductName = productName
                  .toLowerCase()
                  .split(" ")
                  .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
                  .join(" ");

                return (
                  <div
                    key={productName}
                    className="rounded-2xl border border-border bg-surface-muted p-5"
                  >
                    <h4 className="text-lg font-semibold">
                      {displayProductName}
                    </h4>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-sm text-muted">Total</p>
                        <p className="mt-1 text-xl font-semibold">{product.total}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted">Fresh</p>
                        <p className="mt-1 text-xl font-semibold">{product.fresh}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted">Rotten</p>
                        <p className="mt-1 text-xl font-semibold">{product.rotten}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-semibold">
            Scan History
          </h2>
          <Link
            to="/dashboard/scans/history"
            className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
          >
            View full history &rarr;
          </Link>
        </div>

        {loadingHistory ? (
          <p className="text-sm text-muted">Loading scan history...</p>
        ) : recentScans.length > 0 ? (
          <div className="space-y-3">
            {recentScans.map((scan) => (
              <div
                key={scan.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface-elevated p-4"
              >
                <div>
                  <p className="font-medium">{scan.shelf_name}</p>
                  <p
                    className="text-xs text-muted"
                    title={scan.created_at ? new Date(scan.created_at).toLocaleString() : undefined}
                  >
                    {formatHistoryDate(scan.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      scan.status === "COMPLETED"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : scan.status === "FAILED"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {scan.status}
                  </span>
                  <p className="text-xs text-muted mt-1">
                    {scan.item_count} {scan.item_count === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface-elevated p-6 text-center text-sm text-muted">
            No scans recorded yet. Select a shelf and take a scan above!
          </div>
        )}
      </div>

      <ShelfModal
        open={showShelfModal}
        mode="add"
        onClose={() => setShowShelfModal(false)}
        onSubmit={handleShelfSubmit}
      />
    </div>
  );
}
