import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { AdminService } from "./admin.service";

export class AdminController {
  static async listVendors(_req: AuthRequest, res: Response) {
    try {
      const vendors = await AdminService.listVendors();
      return res.status(200).json({ success: true, data: vendors });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async suspendVendor(req: AuthRequest, res: Response) {
    try {
      const result = await AdminService.suspendVendor(
        String(req.params.businessId),
      );
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async activateVendor(req: AuthRequest, res: Response) {
    try {
      const result = await AdminService.activateVendor(
        String(req.params.businessId),
      );
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async stats(_req: AuthRequest, res: Response) {
    try {
      const stats = await AdminService.getStats();
      return res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
