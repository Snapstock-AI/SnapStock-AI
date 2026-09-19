import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { BusinessService } from "./business.service";
import { CreateBusinessSchema } from "./business.types";

export class BusinessController {
  static async listMine(req: AuthRequest, res: Response) {
    try {
      const businesses = await BusinessService.listForUser(req.user!.userId);
      return res.status(200).json({ success: true, data: businesses });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const data = CreateBusinessSchema.parse(req.body);
      const business = await BusinessService.createForUser(
        req.user!.userId,
        data,
      );
      return res.status(201).json({ success: true, data: business });
    } catch (error: any) {
      const message = error?.issues?.[0]?.message || error.message;
      return res.status(400).json({ success: false, message });
    }
  }
}
