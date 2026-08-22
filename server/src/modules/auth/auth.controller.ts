import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { AuthRequest } from "../../shared/middleware/auth.middleware";

export class AuthController {

  //REGISTER
  static async register(req: Request, res: Response) {
    try {
      const result = await AuthService.register(req.body);

      return res.status(201).json({
        success: true,
        data: result
      });

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }


  //LOGIN
  static async login(req: Request, res: Response) {
    try {
      const result = await AuthService.login(req.body);

      return res.status(200).json({
        success: true,
        data: result
      });

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async logout(req: AuthRequest, res: Response) {
    try {
      const result = await AuthService.logout(req.user?.sessionId);

      return res.status(200).json({
        success: true,
        data: result
      });

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const result = await AuthService.refresh(req.body);

      return res.status(200).json({
        success: true,
        data: result
      });

    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  static async verifyEmail(req: Request, res: Response) {
    try {
      const token = req.query.token as string;

      const result = await AuthService.verifyEmail(token);

      return res.status(200).json({
        success: true,
        data: result
      });

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async resendVerification(req: Request, res: Response) {
    try {
      const result = await AuthService.resendVerification(req.body);

      return res.status(200).json({
        success: true,
        data: result
      });

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const result = await AuthService.forgotPassword(req.body);

      return res.status(200).json({
        success: true,
        data: result
      });

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const result = await AuthService.resetPassword(req.body);

      return res.status(200).json({
        success: true,
        data: result
      });

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}
