import { useState } from "react";
import { Camera, Upload } from "lucide-react";
import { analyzeImage } from "../../lib/detection";
import type { DetectionResult } from "../../lib/detection";
import CameraScanner from "../../components/scanner/CameraScanner";
import type { Shelf } from "../../types/shelf";


const scanHistory = [
  { id: 1, shelf: "Shelf A · Bananas", time: "Today, 9:14 AM", score: 71, items: 41 },
  
];




export default function ScansPage() {

  const shelves: Shelf[] = [
  {
    id: "shelf-a",
    name: "Shelf A - Bananas",
    category: "Fruit",
  },
  {
    id: "shelf-b",
    name: "Shelf B - Tomatoes",
    category: "Vegetable",
  },
  {
    id: "shelf-c",
    name: "Shelf C - Apples",
    category: "Fruit",
  },
];

  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const [previewImage, setPreviewImage] = useState<File | null>(null);

  const [result, setResult] = useState<DetectionResult | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [showCamera, setShowCamera] = useState(false);
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);

   const showError = (message: string) => {
  setError(message);

  setTimeout(() => {
    setError("");
  }, 3000);
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

    const data = await analyzeImage(file, shelf);

    setResult(data);

  } finally {
    setLoading(false);
  }
};

 
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {

   
    const file = event.target.files?.[0];

    if (!file) return;

    setPreviewImage(file);
    setResult(null);

    setError("");
    
    await analyzeSelectedImage(
      file,
      selectedShelf
    );


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

      <div className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-8 text-center 
      dark:border-brand-800 dark:bg-brand-900/20">
        <div className="mb-4 ">
          <label className="mt-4 font-serif text-l font-semibold">
          Select a Shelf
        </label>


        <select
          value={selectedShelf?.id || ""}
          onChange={(e)=> {
            const shelf = shelves.find(
              s => s.id === e.target.value
            );

            setSelectedShelf(shelf || null);
          }}
          className="border p-2 rounded w-full inline-flex items-center justify-center  rounded-full px-6 py-3 text-sm  "
        >

        <option value="">
          Select a Shelf
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

                        setSelectedImage(previewImage);

                        setResult(null);

                        setError("");

                        if (!selectedShelf) {
                            showError("Please select a shelf first.");
                            return;
                          }

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
  <div className="relative rounded-xl overflow-hidden">
    <img
      src={URL.createObjectURL(selectedImage)}
      alt="Selected"
      className="mx-auto max-h-80 w-auto rounded-xl border border-border object-contain"
    />

    {loading && (
      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <p className="text-white font-medium">
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
          {result.shelf && (
            <p className="mt-2 text-sm text-muted">
              Shelf: {result.shelf.name}
            </p>
            )}

          <p className="mt-2 text-sm text-muted">
            Total detected items: {result.total_count}
          </p>

          <div className="mt-6 space-y-4">

            {result.detections.map((item, index) => (
              <div
                key={index}
                className="rounded-xl bg-surface-muted p-4"
              >
                <p className="text-lg font-semibold">
                  {item.class_name}
                </p>

                <p className="text-sm">
                  Freshness:
                  <span className="ml-2 font-medium">
                    {item.freshness}
                  </span>
                </p>

                <p className="text-sm">
                  Detection Confidence:
                  <span className="ml-2">
                    {(item.confidence * 100).toFixed(2)}%
                  </span>
                </p>

                <p className="text-sm">
                  Freshness Confidence:
                  <span className="ml-2">
                    {item.freshness_confidence_percent.toFixed(2)}%
                  </span>
                </p>
              </div>
            ))}

          </div>
        </div>
      )}

      <div>

        <h2 className="mb-4 font-serif text-lg font-semibold">
          Scan History
        </h2>

        <div className="space-y-3">

          {scanHistory.map((scan) => (

            <div
              key={scan.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface-elevated p-4"
            >
              <div>
                <p className="font-medium">
                  {scan.shelf}
                </p>

                <p className="text-xs text-muted">
                  {scan.time}
                </p>
              </div>

              <div className="text-right">
                <p className="font-serif text-lg font-semibold text-brand-500">
                  {scan.score}
                </p>

                <p className="text-xs text-muted">
                  {scan.items} items
                </p>
              </div>

            </div>

          ))}

        </div>

      </div>
    </div>
  );
}