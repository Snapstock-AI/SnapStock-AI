import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { InvitationService } from "./invitation.service";
import { AuthService } from "../auth/auth.service";
import { renderInvitationJoinPage, renderStatusPage } from "../../shared/utils/authPages";

export class InvitationController {
  static async accept(req: AuthRequest, res: Response) {
    try {
      const accepted = await InvitationService.accept(
        req.user!.userId,
        String(req.body.token || ""),
      );
      const auth = await AuthService.rotateSession(
        req.user!.sessionId,
        accepted.businessId,
      );

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

  /**
   * Browser-facing counterpart to accept(): the link in the invitation
   * email points here so joining a business works without the separate web
   * client dev server running or being reachable (see shared/utils/authPages.ts).
   */
  static async confirmPage(req: Request, res: Response) {
    const token = String(req.query.token || "");
    try {
      const info = await InvitationService.resolveForPage(token);
      return res.status(200).send(
        renderInvitationJoinPage({
          token,
          businessName: info.businessName,
          email: info.email,
          hasAccount: info.hasAccount,
        }),
      );
    } catch (error: any) {
      return res.status(400).send(
        renderStatusPage({
          success: false,
          heading: "Invitation unavailable",
          message: error.message || "This invitation link is invalid or has expired.",
        }),
      );
    }
  }

  /** Handles the plain HTML form submitted by confirmPage(). */
  static async confirmSubmit(req: Request, res: Response) {
    const token = String(req.body.token || "");
    try {
      const result = await InvitationService.completeViaPage(token, {
        full_name: typeof req.body.full_name === "string" ? req.body.full_name : undefined,
        password: typeof req.body.password === "string" ? req.body.password : undefined,
      });
      return res.status(200).send(
        renderStatusPage({
          success: true,
          heading: "You're in!",
          message: `You've joined ${result.businessName}. Sign in from the SnapStock app with this email to get started.`,
        }),
      );
    } catch (error: any) {
      try {
        const info = await InvitationService.resolveForPage(token);
        return res.status(400).send(
          renderInvitationJoinPage({
            token,
            businessName: info.businessName,
            email: info.email,
            hasAccount: info.hasAccount,
            error: error.message || "Unable to complete the invitation.",
          }),
        );
      } catch (lookupError: any) {
        return res.status(400).send(
          renderStatusPage({
            success: false,
            heading: "Invitation unavailable",
            message: lookupError.message || "This invitation link is invalid or has expired.",
          }),
        );
      }
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
      const { email, full_name } = req.body;

      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Employee email is required.",
        });
      }

      const invitation = await InvitationService.send(
        req.user!.userId,
        String(req.params.businessId),
        {
          email,
          full_name: typeof full_name === "string" ? full_name : undefined,
        },
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
