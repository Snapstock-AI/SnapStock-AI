import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { AuthRepository } from "./auth.repository";
import {
  RegisterDTO,
  LoginDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  ResendVerificationDTO,
} from "./auth.types";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../../shared/utils/email";

export class AuthService {

  //REGISTER USER
  static async register(data: RegisterDTO) {

    const existingUser = await AuthRepository.findByEmail(data.email);

    if (existingUser) {
      throw new Error("User already exists");
    }

    const password_hash = await bcrypt.hash(data.password, 10);

    const user = await AuthRepository.createUser({
      ...data,
      password_hash
    });

    const token = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    await AuthRepository.saveEmailToken(user.id, token, expiresAt);

    await sendVerificationEmail(user.email, token);

    return {
      message: "User registered successfully-Please verify your mail",
      user
    };
  }


  //LOGIN USER
  static async login(data: LoginDTO) {

    const user = await AuthRepository.findByEmail(data.email);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(
      data.password,
      user.password_hash
    );

    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    if (!user.email_verified) {
      throw new Error("Please verify your email first");
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        system_role: user.system_role
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return {
      message: "Login successful",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        system_role: user.system_role
      }
    };
  }

  static async logout() {
    return {
      message: "Logout successful"
    };
  }

  static async verifyEmail(token: string) {
    const record = await AuthRepository.findToken(token);

    if (!record) {
      throw new Error("Invalid or expired token");
    }

    if (new Date() > record.expires_at) {
      throw new Error("Token expired");
    }
    
    const user = await AuthRepository.findById(record.user_id);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.email_verified) {
      return {
        message: "Email already verified"
      };
    }

    await AuthRepository.verifyUser(record.user_id);
    await AuthRepository.deleteEmailToken(token);

    return {
      message: "Email verified successfully"
    };
  }

  static async resendVerification(data: ResendVerificationDTO) {
    const user = await AuthRepository.findByEmail(data.email);

    if (!user) {
      return {
        message: "If an account exists, a verification email has been sent"
      };
    }

    if (user.email_verified) {
      return {
        message: "Email already verified"
      };
    }

    await AuthRepository.deleteEmailTokensForUser(user.id);

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await AuthRepository.saveEmailToken(user.id, token, expiresAt);
    await sendVerificationEmail(user.email, token);

    return {
      message: "If an account exists, a verification email has been sent"
    };
  }

  static async forgotPassword(data: ForgotPasswordDTO) {
    const user = await AuthRepository.findByEmail(data.email);

    if (!user) {
      return {
        message: "If an account exists, a password reset email has been sent"
      };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await AuthRepository.savePasswordResetToken(user.id, token, expiresAt);
    await sendPasswordResetEmail(user.email, token);

    return {
      message: "If an account exists, a password reset email has been sent"
    };
  }

  static async resetPassword(data: ResetPasswordDTO) {
    const record = await AuthRepository.findPasswordResetToken(data.token);

    if (!record) {
      throw new Error("Invalid or expired token");
    }

    if (new Date() > record.expires_at) {
      throw new Error("Token expired");
    }

    const password_hash = await bcrypt.hash(data.password, 10);
    await AuthRepository.updatePassword(record.user_id, password_hash);
    await AuthRepository.deletePasswordResetToken(data.token);

    return {
      message: "Password reset successfully"
    };
  }
}
