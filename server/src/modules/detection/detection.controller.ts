import { Response } from "express";
import { DetectionService } from "./detection.service";
import { AuthRequest } from "../../shared/middleware/auth.middleware";

export class DetectionController {

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