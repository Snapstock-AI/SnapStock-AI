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
  GoogleLoginDTO,
} from "./auth.types";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../../shared/utils/email";
import { BusinessRepository } from "../business/business.repository";
import { OAuth2Client } from "google-auth-library";

const ACCESS_TOKEN_TTL = "1d";
const REFRESH_TOKEN_DAYS = 7;

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
  static async updateProfile(userId: string, full_name: string) {
    const normalizedName = full_name.trim();
    if (!normalizedName || normalizedName.length > 100) {
      throw new Error(
        "Full name is required and must be 100 characters or fewer.",
      );
    }

    const user = await AuthRepository.updateFullName(userId, normalizedName);
    if (!user) throw new Error("User not found");

    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      system_role: user.system_role,
    };
  }
  private static signAccessToken(
    user: {
      id: string;
      email: string;
      system_role: string;
    },
    sessionId: string,
    businessId: string | null,
  ) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        system_role: user.system_role,
        sessionId,
        businessId,
      },
      process.env.JWT_SECRET!,
      { expiresIn: ACCESS_TOKEN_TTL },
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
      expiresAt,
    );

    const businessId = await BusinessRepository.findBusinessIdByUserId(user.id);
    const token = AuthService.signAccessToken(user, session.id, businessId);

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        system_role: user.system_role,
        businessId,
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
      password_hash,
    });

    const token = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    await AuthRepository.saveEmailToken(user.id, token, expiresAt);

    await sendVerificationEmail(user.email, token);

    return {
      message: "User registered successfully-Please verify your mail",
      user,
    };
  }

  //LOGIN USER
  static async login(data: LoginDTO) {
    const user = await AuthRepository.findByEmail(data.email);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    if (!user.password_hash) {
      throw new Error(
        "This account uses Google Sign-In. Please continue with Google.",
      );
    }

    const isMatch = await bcrypt.compare(data.password, user.password_hash);

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

  static async loginWithGoogle(data: GoogleLoginDTO) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error("Google Sign-In is not configured");
    }

    if (!data.credential?.trim()) {
      throw new Error("Google credential is required");
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: data.credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new Error("Invalid Google credential");
    }

    if (payload.email_verified === false) {
      throw new Error("Google email is not verified");
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const fullName =
      payload.name?.trim() ||
      [payload.given_name, payload.family_name].filter(Boolean).join(" ").trim() ||
      email.split("@")[0];

    let user = await AuthRepository.findByGoogleId(googleId);

    if (!user) {
      const existing = await AuthRepository.findByEmail(email);

      if (existing) {
        if (existing.google_id && existing.google_id !== googleId) {
          throw new Error("This email is linked to a different Google account");
        }

        await AuthRepository.linkGoogleAccount(existing.id, googleId);
        user = await AuthRepository.findByGoogleId(googleId);
      } else {
        await AuthRepository.createUser({
          full_name: fullName.slice(0, 100),
          email,
          password: "",
          password_hash: null,
          google_id: googleId,
          email_verified: true,
        });
        user = await AuthRepository.findByGoogleId(googleId);
      }
    }

    if (!user) {
      throw new Error("Unable to sign in with Google");
    }

    if (!user.email_verified) {
      await AuthRepository.verifyUser(user.id);
      user = { ...user, email_verified: true };
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
      message: "Logout successful",
    };
  }

  static async rotateSession(sessionId: string) {
    const session = await AuthRepository.findActiveSessionById(sessionId);

    if (!session || new Date() > session.expires_at) {
      throw new Error("Session expired or revoked");
    }

    const user = await AuthRepository.findById(session.user_id);

    if (!user) {
      throw new Error("User not found");
    }

    await AuthRepository.revokeSession(session.id);

    return AuthService.createSessionTokens({
      id: user.id,
      email: user.email,
      system_role: user.system_role,
      full_name: user.full_name,
    });
  }

  static async refresh(data: RefreshTokenDTO) {
    const session = await AuthRepository.findActiveSessionByRefreshToken(
      data.refreshToken,
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
        message: "Email already verified",
      };
    }

    await AuthRepository.verifyUser(record.user_id);
    await AuthRepository.deleteEmailToken(token);

    return {
      message: "Email verified successfully",
    };
  }

  static async resendVerification(data: ResendVerificationDTO) {
    const user = await AuthRepository.findByEmail(data.email);

    if (!user) {
      return {
        message: "If an account exists, a verification email has been sent",
      };
    }

    if (user.email_verified) {
      return {
        message: "Email already verified",
      };
    }

    await AuthRepository.deleteEmailTokensForUser(user.id);

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await AuthRepository.saveEmailToken(user.id, token, expiresAt);
    await sendVerificationEmail(user.email, token);

    return {
      message: "If an account exists, a verification email has been sent",
    };
  }

  static async forgotPassword(data: ForgotPasswordDTO) {
    const user = await AuthRepository.findByEmail(data.email);

    if (!user || !user.password_hash) {
      return {
        message: "If an account exists, a password reset email has been sent",
      };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await AuthRepository.savePasswordResetToken(user.id, token, expiresAt);
    await sendPasswordResetEmail(user.email, token);

    return {
      message: "If an account exists, a password reset email has been sent",
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
      message: "Password reset successfully",
    };
  }
}
