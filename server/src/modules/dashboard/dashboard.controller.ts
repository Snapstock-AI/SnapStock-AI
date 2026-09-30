import { errorMessage, errorStatus } from "../../shared/utils/errors";
import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { AlertError } from "../alerts/alert.service";
import { DashboardService } from "./dashboard.service";

export class DashboardController {
  static async dashboard(req: AuthRequest, res: Response) {
    try {
      const days = Number(req.query.days || 7);
      const data = await DashboardService.getDashboard(
        req.user!.userId,
        String(req.params.businessId),
        Number.isFinite(days) && days > 0 ? days : 7,
      );
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(errorStatus(error)).json({ success: false, message: errorMessage(error) });
    }
  }

  static async analytics(req: AuthRequest, res: Response) {
    try {
      const days = Number(req.query.days || 7);
      const data = await DashboardService.getAnalytics(
        req.user!.userId,
        String(req.params.businessId),
        Number.isFinite(days) && days > 0 ? days : 7,
      );
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(errorStatus(error)).json({ success: false, message: errorMessage(error) });
    }
  }

  static async inventory(req: AuthRequest, res: Response) {
    try {
      const days = Number(req.query.days || 7);
      const data = await DashboardService.getInventory(
        req.user!.userId,
        String(req.params.businessId),
        Number.isFinite(days) && days > 0 ? days : 7,
      );
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(errorStatus(error)).json({ success: false, message: errorMessage(error) });
    }
  }

  static async alerts(req: AuthRequest, res: Response) {
    try {
      const countOnly = req.query.countOnly === "1" || req.query.unreadCountOnly === "1";
      const data = await DashboardService.getAlerts(
        req.user!.userId,
        String(req.params.businessId),
        !countOnly,
      );
      if (countOnly) {
        return res.status(200).json({
          success: true,
          data: { count: data.count },
        });
      }
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(errorStatus(error)).json({ success: false, message: errorMessage(error) });
    }
  }

  static async resolveAlert(req: AuthRequest, res: Response) {
    try {
      const data = await DashboardService.resolveAlert(
        req.user!.userId,
        String(req.params.businessId),
        String(req.params.alertId),
      );
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      const status = error instanceof AlertError ? error.status : 400;
      return res.status(status).json({ success: false, message: error.message });
    }
  }
}
