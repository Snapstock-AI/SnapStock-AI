
export type PredictionResult = {
  freshness: string;
  confidence: number;
  confidence_percent: number;
  model?: string;
  message?: string;
};

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL;

export async function analyzeImage(file: File): Promise<PredictionResult> {
  const formData = new FormData();

  // IMPORTANT: field name must be "file"
  // because FastAPI expects file: UploadFile = File(...)
  formData.append("file", file);

  const response = await fetch(`${AI_SERVICE_URL}/predict`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Failed to analyze image");
  }

  return data;
}

