import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { InvitationService } from "./invitation.service";

export class InvitationController {
  static async accept(req: Request, res: Response) {
    try {
      const result = await InvitationService.accept(
        String(req.body.token || ""),
      );

      return res.status(200).json({
        success: true,
        data: result,
        message:
          "Invitation accepted. Sign in with the temporary password from your invitation email.",
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
      const { email, full_name, nic, date_of_birth } = req.body;

      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Employee email is required.",
        });
      }

      if (typeof full_name !== "string" || !full_name.trim()) {
        return res
          .status(400)
          .json({ success: false, message: "Employee name is required." });
      }

      const invitation = await InvitationService.send(
        req.user!.userId,
        String(req.params.businessId),
        { email, full_name, nic, date_of_birth },
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
