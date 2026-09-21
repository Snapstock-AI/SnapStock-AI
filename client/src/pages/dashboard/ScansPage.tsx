import { useEffect, useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import { Link } from "react-router";
import { analyzeImage, countHistoryItems, formatHistoryDate, getScanHistory } from "../../lib/detection";
import { updateDetectionFreshness } from "../../lib/detection";
import type {
  DetectionResult,
  FreshnessStatus,
  ScanHistoryItem,
} from "../../lib/detection";
import { getShelves } from "../../lib/shelf";
import CameraScanner from "../../components/scanner/CameraScanner";
import type { Shelf } from "../../types/shelf";
import { useAuth } from "@/context/AuthContext";


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
) => {

  if (!shelf) {
    showError("Please select a shelf first.");
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
      businessId!,
      token
    );

    setResult(data);
  } catch (error: unknown) {

    showError(
      error instanceof Error ? error.message : "Image analysis failed."
    );  

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
      
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold md:text-3xl">
            Shelf scans
          </h1>

          <p className="mt-1 text-sm text-muted">
            Capture and review AI-powered produce inspections
          </p>
        </div>

        <Link
          to="/dashboard/shelves"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Add shelf
        </Link>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-8 text-center 
      dark:border-brand-800 dark:bg-brand-900/20">
        <div className="mb-4 ">
          <label className="mt-4 font-serif text-l font-semibold">
          Select a Shelf
        </label>


        <select
          value={selectedShelf?.id || ""}
          disabled={shelvesLoading || shelves.length === 0}
          onChange={(e)=> {
            const shelf = shelves.find(
              s => s.id === e.target.value
            );

            setSelectedShelf(shelf || null);
          }}
          className="border p-2 rounded w-full inline-flex items-center justify-center  rounded-full px-3 py-2 text-sm  "
        >
          
              <option value="" >
                    {shelvesLoading ? "Loading shelves..." : "Select a shelf"}
              </option>
        

        {shelves.map((shelf)=>(
          <option
            key={shelf.id}
            value={shelf.id}
          >
            {shelf.name} ({shelf.category})
          </option>
        ))}

        </select>

        {!shelvesLoading && shelves.length === 0 && (
          <p className="mt-2 text-sm text-muted">
            No shelves found. Create a shelf before starting a scan.
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

              if(!selectedShelf){

                e.preventDefault();

                showError("Please select a shelf first.");

              }

            }} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold hover:bg-surface-muted">
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

        <div className="
        fixed inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/70
        p-4
        ">

        <div className="
        w-full
        max-w-3xl
        rounded-2xl
        bg-surface-elevated
        p-6
        ">


        <h2 className="
        mb-4
        text-xl
        font-semibold
        ">

        Camera

        </h2>



        <CameraScanner

        onClose={() =>
          setShowCamera(false)
        }


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

  await analyzeSelectedImage(
    previewImage,
    selectedShelf
  );

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
            Analyzing...
          </p>
        </div>
      </div>
    )}
  </div>
)}
          
          

      

      <div className="space-y-6">
        {error && (
  <div
    className="
      fixed
      top-5
      right-5
      z-50
      rounded-xl
      border
      border-red-300
      bg-red-50
      px-5
      py-3
      text-red-700
      shadow-lg
      animate-in
      slide-in-from-right
    "
  >
    {error}
  </div>
  )}
  </div>
      
      

    
      {result && (
  <div className="rounded-2xl border border-border bg-surface-elevated p-6">

    <h2 className="font-serif text-xl font-semibold">
      Scan Result
    </h2>

    {selectedShelf && (
      <p className="mt-2 text-sm text-muted">
        Shelf: {selectedShelf.name}
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

        {result.detections.map((detection, index) => (
          <div
            key={detection.id || `${detection.class_name}-${index}`}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-muted p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold capitalize">{detection.class_name}</p>
              <p className="mt-1 text-sm text-muted">
                Model freshness: {detection.freshness}
                {detection.freshness_confidence_percent
                  ? ` (${detection.freshness_confidence_percent.toFixed(0)}% confidence)`
                  : ""}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">Correct state</span>
              <select
                value={detection.freshness}
                disabled={!detection.id || savingDetectionId === detection.id}
                onChange={(event) =>
                  handleFreshnessChange(
                    detection.id,
                    event.target.value as FreshnessStatus,
                  )
                }
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="Fresh">Fresh</option>
                <option value="Medium">Medium</option>
                <option value="Spoiled">Spoiled</option>
              </select>
            </label>
          </div>
        ))}

        {Object.entries(result.counts).map(
          ([productName, product]) => (

            <div
              key={productName}
              className="rounded-2xl border border-border bg-surface-muted p-5"
            >

              <h4 className="text-lg font-semibold capitalize">
                {productName}
              </h4>

              <div className="mt-4 grid grid-cols-3 gap-3">

                <div>
                  <p className="text-sm text-muted">
                    Total
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {product.total}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted">
                    Fresh
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {product.fresh}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted">
                    Rotten
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {product.rotten}
                  </p>
                </div>

              </div>

            </div>

          )
        )}

      </div>

    </div>

  </div>
)}

      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-lg font-semibold">Scan History</h2>
            <p className="mt-1 text-sm text-muted">Today and previous scans</p>
          </div>
          <Link
            to="/dashboard/scans/history"
            className="shrink-0 text-sm font-semibold text-brand-500 hover:underline"
          >
            Custom date range
          </Link>
        </div>

        {historyLoading && <p className="text-sm text-muted">Loading scan history...</p>}
        {!historyLoading && historyError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {historyError}
          </div>
        )}
        {!historyLoading && !historyError && scanHistory.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
            No scans found.
          </div>
        )}
        {!historyLoading && scanHistory.length > 0 && (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-elevated">
            {scanHistory.map((scan) => (
              <button
                key={scan.id}
                type="button"
                onClick={() => setSelectedHistoryScan(scan)}
                className="flex w-full flex-col gap-2 px-4 py-4 text-left transition hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{scan.shelf_name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {scan.item_count} item{scan.item_count === 1 ? "" : "s"} · Fresh {scan.fresh_count} · Medium {scan.medium_count} · Spoiled {scan.spoiled_count}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span>{scan.status}</span>
                  <span>{formatHistoryDate(scan.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedHistoryScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="scan-details-title">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface-elevated p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Scan details</p>
                <h2 id="scan-details-title" className="mt-1 font-serif text-2xl font-semibold">{selectedHistoryScan.shelf_name}</h2>
                <p className="mt-1 text-sm text-muted">{formatHistoryDate(selectedHistoryScan.created_at)}</p>
              </div>
              <button type="button" onClick={() => setSelectedHistoryScan(null)} className="rounded-full p-2 text-muted hover:bg-surface-muted hover:text-foreground" aria-label="Close scan details">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-xl bg-surface-muted p-3"><p className="text-muted">Status</p><p className="mt-1 font-semibold">{selectedHistoryScan.status}</p></div>
              <div className="rounded-xl bg-surface-muted p-3"><p className="text-muted">Items</p><p className="mt-1 font-semibold">{selectedHistoryScan.item_count}</p></div>
              <div className="rounded-xl bg-surface-muted p-3"><p className="text-muted">Fresh</p><p className="mt-1 font-semibold">{selectedHistoryScan.fresh_count}</p></div>
              <div className="rounded-xl bg-surface-muted p-3"><p className="text-muted">Spoiled</p><p className="mt-1 font-semibold">{selectedHistoryScan.spoiled_count}</p></div>
            </div>

            <h3 className="mt-6 font-serif text-lg font-semibold">Detected items</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(countHistoryItems(selectedHistoryScan.items)).map(([type, count]) => (
                <span key={type} className="rounded-lg bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                  {type}: {count}
                </span>
              ))}
            </div>
            <div className="mt-3 divide-y divide-border rounded-xl border border-border">
              {selectedHistoryScan.items.length === 0 && <p className="p-4 text-sm text-muted">No detected items.</p>}
              {selectedHistoryScan.items.map((item, index) => (
                <div key={`${selectedHistoryScan.id}-${item.type}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
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