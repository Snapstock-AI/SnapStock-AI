import { errorMessage, errorStatus } from "../../shared/utils/errors";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { AuthRequest } from "../../shared/middleware/auth.middleware";

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
