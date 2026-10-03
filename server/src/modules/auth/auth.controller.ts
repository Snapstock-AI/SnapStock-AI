import { errorMessage, errorStatus } from "../../shared/utils/errors";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { renderResetPasswordForm, renderStatusPage } from "../../shared/utils/authPages";

export class AuthController {
  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const user = await AuthService.updateProfile(
        req.user!.userId,
        String(req.body.full_name || ""),
      );
      return res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      return res.status(errorStatus(error)).json({ success: false, message: errorMessage(error) });
    }
  }

  static async changePassword(req: AuthRequest, res: Response) {
    try {
      const password = String(req.body.password || "");
      const result = await AuthService.changePassword(
        req.user!.userId,
        password,
      );
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  //REGISTER
  static async register(req: Request, res: Response) {
    try {
      const result = await AuthService.register(req.body);

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(errorStatus(error)).json({
        success: false,
        message: errorMessage(error),
      });
    }
  }

  //LOGIN
  static async login(req: Request, res: Response) {
    try {
      const result = await AuthService.login(req.body);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(errorStatus(error)).json({
        success: false,
        message: errorMessage(error),
      });
    }
  }

  static async googleLogin(req: Request, res: Response) {
    try {
      const result = await AuthService.loginWithGoogle(req.body);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(errorStatus(error)).json({
        success: false,
        message: errorMessage(error),
      });
    }
  }

  static async logout(req: AuthRequest, res: Response) {
    try {
      const result = await AuthService.logout(req.user?.sessionId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(errorStatus(error)).json({
        success: false,
        message: errorMessage(error),
      });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const result = await AuthService.refresh(req.body);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: errorMessage(error),
      });
    }
  }

  static async verifyEmail(req: Request, res: Response) {
    try {
      const token = req.query.token as string;

      const result = await AuthService.verifyEmail(token);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(errorStatus(error)).json({
        success: false,
        message: errorMessage(error),
      });
    }
  }

  /**
   * Browser-facing counterpart to verifyEmail(): the link inside the
   * verification email points here so the flow works without the separate
   * web client dev server running or being reachable.
   */
  static async verifyEmailPage(req: Request, res: Response) {
    const token = String(req.query.token || "");
    try {
      const result = await AuthService.verifyEmail(token);
      return res.status(200).send(
        renderStatusPage({
          success: true,
          heading: "Email verified",
          message: `${result.message} You can now sign in from the SnapStock app.`,
        }),
      );
    } catch (error: any) {
      return res.status(400).send(
        renderStatusPage({
          success: false,
          heading: "Verification failed",
          message: error.message || "This verification link is invalid or has expired.",
        }),
      );
    }
  }

  /** Renders the reset-password form; see verifyEmailPage() for why this exists. */
  static async resetPasswordPage(req: Request, res: Response) {
    const token = String(req.query.token || "");
    if (!token) {
      return res.status(400).send(
        renderStatusPage({
          success: false,
          heading: "Invalid link",
          message: "This reset-password link is missing its token.",
        }),
      );
    }
    return res.status(200).send(renderResetPasswordForm({ token }));
  }

  /** Handles the plain HTML form submitted by resetPasswordPage(). */
  static async resetPasswordConfirm(req: Request, res: Response) {
    const token = String(req.body.token || "");
    const password = String(req.body.password || "");
    try {
      const result = await AuthService.resetPassword({ token, password });
      return res.status(200).send(
        renderStatusPage({
          success: true,
          heading: "Password updated",
          message: `${result.message} You can now sign in from the SnapStock app with your new password.`,
        }),
      );
    } catch (error: any) {
      return res.status(400).send(
        renderResetPasswordForm({
          token,
          error: error.message || "Unable to reset password.",
        }),
      );
    }
  }

  static async resendVerification(req: Request, res: Response) {
    try {
      const result = await AuthService.resendVerification(req.body);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(errorStatus(error)).json({
        success: false,
        message: errorMessage(error),
      });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const result = await AuthService.forgotPassword(req.body);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(errorStatus(error)).json({
        success: false,
        message: errorMessage(error),
      });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const result = await AuthService.resetPassword(req.body);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(errorStatus(error)).json({
        success: false,
        message: errorMessage(error),
      });
    }
  }
}
