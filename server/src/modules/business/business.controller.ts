import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { AuthService } from "../auth/auth.service";
import { BusinessService } from "./business.service";
import { CreateBusinessSchema, UpdateBusinessSchema } from "./business.types";

export class BusinessController {
  static async update(req: AuthRequest, res: Response) {
    try {
      const data = UpdateBusinessSchema.parse(req.body);
      const business = await BusinessService.updateForOwner(
        req.user!.userId,
        String(req.params.businessId),
        data,
      );
      return res.status(200).json({ success: true, data: business });
    } catch (error: any) {
      const message = error?.issues?.[0]?.message || error.message;
      return res.status(400).json({ success: false, message });
    }
  }

  static async remove(req: AuthRequest, res: Response) {
    try {
      await BusinessService.deleteForOwner(
        req.user!.userId,
        String(req.params.businessId),
      );
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async listEmployees(req: AuthRequest, res: Response) {
    try {
      const employees = await BusinessService.listEmployees(
        req.user!.userId,
        String(req.params.businessId),
      );

      return res.status(200).json({ success: true, data: employees });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async removeEmployee(req: AuthRequest, res: Response) {
    try {
      await BusinessService.removeEmployee(
        req.user!.userId,
        String(req.params.businessId),
        String(req.params.userId),
      );

      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

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
      const auth = await AuthService.rotateSession(
        req.user!.sessionId,
        business.id,
      );

      return res.status(201).json({
        success: true,
        data: {
          business,
          ...auth,
        },
      });
    } catch (error: any) {
      const message = error?.issues?.[0]?.message || error.message;
      return res.status(400).json({ success: false, message });
    }
  }

  static async switchBusiness(req: AuthRequest, res: Response) {
    try {
      const businessId = String(req.body.businessId || "");
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: "businessId is required.",
        });
      }

      const auth = await AuthService.switchBusiness(
        req.user!.sessionId,
        businessId,
      );

      return res.status(200).json({
        success: true,
        data: auth,
        message: "Workspace switched.",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Unable to switch workspace.",
      });
    }
  }
}
