import { Request, Response } from "express";
import { DetectionService } from "./detection.service";

export class DetectionController {

  static async analyze(req: Request, res: Response) {
    try {

      const result = await DetectionService.analyze(req.file);

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