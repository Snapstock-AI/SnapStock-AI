import axios from "axios";
import FormData from "form-data";

import type {
  AnalyzeRequest,
  AIDetection,
  AIAnalysisResponse,
  SavedDetection,
  DetectionResult,
} from "./detection.types";

import { DetectionRepository } from "./detection.repository";

function mapFreshness(
  freshness: string | null | undefined
): "Fresh" | "Spoiled" | "UNKNOWN" {

  if (!freshness) {
    return "UNKNOWN";
  }

  switch (freshness.toLowerCase()) {

    case "good":
      return "Fresh";

    case "bad":
      return "Spoiled";

    default:
      return "UNKNOWN";
  }
}

export class DetectionService {

  static async analyze(
    file: Express.Multer.File | undefined,
    businessId: string,
    shelfId: string,
    userId: string
  ): Promise<DetectionResult> { 

    if (!file) {
      throw new Error("No image uploaded.");
    }

    if (!businessId) {
      throw new Error("Business ID is required.");
    }

    if (!shelfId) {
      throw new Error("Shelf ID is required.");
    }

    if (!userId) {
      throw new Error("User ID is required.");
    }

    
    const analyzeRequest: AnalyzeRequest = {
      businessId,
      shelfId,
      userId,
    };

    const scan = await DetectionRepository.createScan(
      analyzeRequest.businessId,
      analyzeRequest.shelfId,
      analyzeRequest.userId
    );

    const scanId = scan.id;

    try {

      await DetectionRepository.updateScanStatus(
        scanId,
        "PROCESSING"
      );

      const formData = new FormData();

      formData.append(
        "file",
        file.buffer,
        {
          filename: file.originalname,
          contentType: file.mimetype,
        }
      );

     
      const response = await axios.post<AIAnalysisResponse>(
        `${process.env.AI_SERVICE_URL}/analyze`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        }
      );

      
      const aiResult: AIAnalysisResponse = response.data;

      console.log(
        "========== AI SERVICE RESULT =========="
      );

      console.log(
        JSON.stringify(aiResult, null, 2)
      );

    
      const savedDetections: SavedDetection[] = [];

      for (const detection of aiResult.detections) {

        const product =
          await DetectionRepository.findProductByName(
            analyzeRequest.businessId,
            detection.class_name
          );

        const savedDetection =
          await DetectionRepository.createDetection(
            scanId,
            detection.class_name,
            product ? product.id : null,
            detection.confidence,
            detection.bounding_box,
            mapFreshness(detection.freshness),
            detection.freshness_confidence
          );

        const boundingBox =
          typeof savedDetection.bbox_json === "string"
            ? JSON.parse(savedDetection.bbox_json)
            : savedDetection.bbox_json;

        savedDetections.push({

          id: savedDetection.id,

          class_name: savedDetection.product_label,

          confidence: Number(
            savedDetection.confidence
          ),

          bounding_box: boundingBox,

          freshness: savedDetection.freshness,

          freshness_confidence: Number(
            savedDetection.freshness_confidence
          ),

          freshness_confidence_percent:
            Number(
              savedDetection.freshness_confidence
            ) * 100,
        });
      }

      await DetectionRepository.updateScanStatus(
        scanId,
        "COMPLETED"
      );

     
      const result: DetectionResult = {

        scanId,

        image_width: aiResult.image_width,

        image_height: aiResult.image_height,

        total_count: aiResult.total_count,

        counts: aiResult.counts,

        detections: savedDetections,
      };

      console.log(
        "========== BACKEND RESPONSE =========="
      );

      console.log(
        JSON.stringify(result, null, 2)
      );

      return result;

    } catch (error: any) {

      await DetectionRepository.updateScanStatus(
        scanId,
        "FAILED",
        error.message
      );

      throw error;
    }
  }
}