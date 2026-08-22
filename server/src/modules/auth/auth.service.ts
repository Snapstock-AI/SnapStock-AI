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
  RefreshTokenDTO,
} from "./auth.types";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../../shared/utils/email";

const ACCESS_TOKEN_TTL = "1d";
const REFRESH_TOKEN_DAYS = 7;

export class AuthService {

  private static signAccessToken(user: {
    id: string;
    email: string;
    system_role: string;
  }, sessionId: string) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        system_role: user.system_role,
        sessionId,
      },
      process.env.JWT_SECRET!,
      { expiresIn: ACCESS_TOKEN_TTL }
    );
  }

  private static async createSessionTokens(user: {
    id: string;
    email: string;
    system_role: string;
    full_name: string;
  }) {
    const refreshToken = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

    const session = await AuthRepository.createSession(
      user.id,
      refreshToken,
      expiresAt
    );

    const token = AuthService.signAccessToken(user, session.id);

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        system_role: user.system_role,
      },
    };
  }

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

    const session = await AuthService.createSessionTokens(user);

    return {
      message: "Login successful",
      ...session,
    };
  }

  static async logout(sessionId?: string) {
    if (sessionId) {
      await AuthRepository.revokeSession(sessionId);
    }

    return {
      message: "Logout successful"
    };
  }

  static async refresh(data: RefreshTokenDTO) {
    const session = await AuthRepository.findActiveSessionByRefreshToken(
      data.refreshToken
    );

    if (!session || new Date() > session.expires_at) {
      throw new Error("Invalid or expired refresh token");
    }

    const user = await AuthRepository.findById(session.user_id);

    if (!user) {
      throw new Error("User not found");
    }

    await AuthRepository.revokeSession(session.id);

    const next = await AuthService.createSessionTokens({
      id: user.id,
      email: user.email,
      system_role: user.system_role,
      full_name: user.full_name,
    });

    return {
      message: "Token refreshed",
      ...next,
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
    await AuthRepository.revokeSessionsForUser(record.user_id);

    return {
      message: "Password reset successfully"
    };
  }
}
