import { Response } from "express";
import { DetectionService } from "./detection.service";
import { AuthRequest } from "../../shared/middleware/auth.middleware";

export class DetectionController {
  static async history(req: AuthRequest, res: Response) {
    try {
      const businessId = String(req.query.businessId || "");
      const endDate = req.query.endDate
        ? new Date(String(req.query.endDate))
        : new Date();
      const startDate = req.query.startDate
        ? new Date(String(req.query.startDate))
        : new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

      if (
        !businessId ||
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      ) {
        return res.status(400).json({
          success: false,
          message: "Business ID and valid date range are required.",
        });
      }

      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          message: "Start date must be before end date.",
        });
      }

      const scans = await DetectionService.history(
        req.user!.userId,
        businessId,
        startDate,
        endDate,
      );

      return res.status(200).json({ success: true, data: scans });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async correctFreshness(req: AuthRequest, res: Response) {
    try {
      const { freshness } = req.body;

      if (typeof freshness !== "string") {
        return res.status(400).json({
          success: false,
          message: "Freshness state is required.",
        });
      }

      const detection = await DetectionService.correctFreshness(
        req.user!.userId,
        String(req.params.detectionId),
        freshness,
      );

      return res.status(200).json({
        success: true,
        data: {
          id: detection?.id,
          freshness: detection?.corrected_freshness,
          corrected_freshness: detection?.corrected_freshness,
        },
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Unable to correct freshness.",
      });
    }
  }

  static async getScanStatus(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { scanId } = req.params;
      if (typeof scanId !== "string") {
        return res.status(400).json({
          success: false,
          message: "Scan ID is required",
        });
      }

      const result = await DetectionService.getScanStatus(scanId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async queueUploadedScan(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { scanId, businessId, shelfId, objectKey, contentType } = req.body;

      await DetectionService.queueUploadedScan({
        eventType: "IMAGE_UPLOADED",
        scanId,
        businessId,
        shelfId,
        userId: req.user.id,
        bucket: process.env.S3_UPLOAD_BUCKET || "snapstock-uploads",
        objectKey,
        contentType,
        timestamp: new Date().toISOString(),
      });

      return res.status(202).json({
        success: true,
        data: { scanId, status: "QUEUED" },
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async createUploadUrl(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { businessId, shelfId, fileName, contentType } = req.body;

      const result = await DetectionService.createUploadUrl({
        businessId,
        shelfId,
        userId: req.user.id,
        fileName,
        contentType,
      });

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}
