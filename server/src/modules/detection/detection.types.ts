export interface AnalyzeRequest {
  businessId: string;
  shelfId: string;
  userId: string;
}

export interface AIDetection {
  class_name: string;
  confidence: number;
  bounding_box: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  freshness: string;
  freshness_confidence: number;
  freshness_confidence_percent: number;
}

export interface AIAnalysisResponse {
  image_width: number;
  image_height: number;
  total_count: number;
  counts: Record<string, number>;
  detections: AIDetection[];
}