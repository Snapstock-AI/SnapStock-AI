import { Response } from "express";
import { DetectionService } from "./detection.service";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { BusinessService } from "../business/business.service";

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

  static async analyze(req: AuthRequest, res: Response) {
    try {
      console.log("========== DETECTION REQUEST ==========");

      console.log("File:", req.file?.originalname);

      console.log("Business ID:", req.body.businessId);

      console.log("Shelf ID:", req.body.shelfId);

      console.log("Authenticated user:", req.user);

      const { businessId, shelfId, scanMode = "STOCK_IN" } = req.body;
      if (scanMode !== "STOCK_IN" && scanMode !== "STOCK_OUT") {
        return res.status(400).json({ success: false, message: "Invalid scan mode." });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const userId = req.user.id;

      await BusinessService.assertMember(userId, businessId);

      const result = await DetectionService.analyze(
        req.file,
        businessId,
        shelfId,
        userId,
        scanMode,
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
