import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { InvitationService } from "./invitation.service";
import { AuthService } from "../auth/auth.service";

export class InvitationController {
  static async accept(req: AuthRequest, res: Response) {
    try {
      await InvitationService.accept(
        req.user!.userId,
        String(req.body.token || ""),
      );
      const auth = await AuthService.rotateSession(req.user!.sessionId);

      return res.status(200).json({
        success: true,
        data: auth,
        message: "Invitation accepted successfully.",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Unable to accept invitation.",
      });
    }
  }

  static async list(req: AuthRequest, res: Response) {
    try {
      const invitations = await InvitationService.list(
        req.user!.userId,
        String(req.params.businessId),
      );

      return res.status(200).json({ success: true, data: invitations });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Unable to load invitations.",
      });
    }
  }

  static async send(req: AuthRequest, res: Response) {
    try {
      const { email } = req.body;

      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Employee email is required.",
        });
      }

      const invitation = await InvitationService.send(
        req.user!.userId,
        String(req.params.businessId),
        email,
      );

      return res.status(201).json({
        success: true,
        data: invitation,
        message: "Invitation sent successfully.",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Unable to send invitation.",
      });
    }
  }
}
