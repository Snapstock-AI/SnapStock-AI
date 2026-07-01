import { Request, Response } from "express";
import { AuthService } from "./auth.service";

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
}
