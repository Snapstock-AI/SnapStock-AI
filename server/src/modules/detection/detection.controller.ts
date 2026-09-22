import { Response } from "express";
import { DetectionService } from "./detection.service";
import { AuthRequest } from "../../shared/middleware/auth.middleware";

export class DetectionController {

  static async getScanStatus(
    req: AuthRequest,
    res: Response
  ) {
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

  static async queueUploadedScan(
    req: AuthRequest,
    res: Response
  ) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const {
        scanId,
        businessId,
        shelfId,
        objectKey,
        contentType,
      } = req.body;

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

  static async createUploadUrl(
    req: AuthRequest,
    res: Response
  ) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const {
        businessId,
        shelfId,
        fileName,
        contentType,
      } = req.body;

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

  static async analyze(
    req: AuthRequest,
    res: Response
  ) {

    try {
            console.log("========== DETECTION REQUEST ==========");

      console.log("File:", req.file?.originalname);

      console.log("Business ID:", req.body.businessId);

      console.log("Shelf ID:", req.body.shelfId);

      console.log("Authenticated user:", req.user);

      const {
        businessId,
        shelfId,
      } = req.body;


      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }


      const userId = req.user.id;


      const result = await DetectionService.analyze(
        req.file,
        businessId,
        shelfId,
        userId
      );


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
}