import { errorMessage, errorStatus } from "../../shared/utils/errors";
import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { ShelfService } from "./shelf.service";

export class ShelfController {
  static async list(req: AuthRequest, res: Response) {
    try {
      const businessId = String(req.query.businessId || "");

      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: "Business ID is required.",
        });
      }

      const shelves = await ShelfService.listForBusiness(
        req.user!.userId,
        businessId,
      );

      return res.status(200).json({ success: true, data: shelves });
    } catch (error: any) {
      return res.status(errorStatus(error)).json({ success: false, message: errorMessage(error) });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const { businessId, name, category } = req.body;

      if (!businessId || !name?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Business ID and shelf name are required.",
        });
      }

      const shelf = await ShelfService.create(
        req.user!.userId,
        businessId,
        name,
        category,
      );

      return res.status(201).json({ success: true, data: shelf });
    } catch (error: any) {
      return res.status(errorStatus(error)).json({ success: false, message: errorMessage(error) });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const { name, category } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Shelf name is required.",
        });
      }

      const shelf = await ShelfService.update(
        req.user!.userId,
        String(req.params.id),
        name,
        category,
      );

      return res.status(200).json({ success: true, data: shelf });
    } catch (error: any) {
      return res.status(errorStatus(error)).json({ success: false, message: errorMessage(error) });
    }
  }

  static async remove(req: AuthRequest, res: Response) {
    try {
      await ShelfService.remove(req.user!.userId, String(req.params.id));
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(errorStatus(error)).json({ success: false, message: errorMessage(error) });
    }
  }
}
