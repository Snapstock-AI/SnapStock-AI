import { useState } from "react";
import type { ChangeEvent } from "react";

import { analyzeImage } from "../services/aiservices";
import type { PredictionResult } from "../services/aiservices";

function CameraCapture() {
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    setSelectedImageFile(file);
    setImagePreview(imageUrl);

    // Clear previous result when new image is selected
    setPrediction(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedImageFile) {
      setError("Please capture an image first.");
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      setPrediction(null);

      const result = await analyzeImage(selectedImageFile);

      setPrediction(result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong while analyzing the image.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div>
      <h2>Scan Fruit</h2>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageChange}
      />

      {imagePreview && (
        <div>
          <h3>Preview</h3>

          <img
            src={imagePreview}
            alt="Captured fruit"
            width="300"
          />

          <br />

          <button onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      )}

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      {prediction && (
        <div>
          <h3>Analysis Result</h3>

          <p>
            Freshness: {prediction.freshness}
          </p>

          <p>
            Confidence: {prediction.confidence_percent}%
          </p>

          {prediction.message && (
            <p>
              {prediction.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default CameraCapture;