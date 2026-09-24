import { IsNull } from "typeorm";
import { AppDataSource } from "../../config/data-source";
import { User } from "../../entities/User";
import { EmailVerificationToken } from "../../entities/EmailVerificationToken";
import { PasswordResetToken } from "../../entities/PasswordResetToken";
import { Session } from "../../entities/Session";
import { RegisterDTO } from "./auth.types";

export class AuthRepository {
  static async updateFullName(userId: string, full_name: string) {
    await AppDataSource.getRepository(User).update(
      { id: userId },
      { full_name },
    );
    return this.findById(userId);
  }

  //CREATE USER-REGISTER
  static async createUser(
    data: RegisterDTO & {
      password_hash: string | null;
      google_id?: string | null;
      email_verified?: boolean;
    },
  ) {
    const repo = AppDataSource.getRepository(User);

    const user = repo.create({
      full_name: data.full_name,
      email: data.email,
      password_hash: data.password_hash,
      google_id: data.google_id ?? null,
      nic: data.nic ?? null,
      date_of_birth: data.date_of_birth ?? null,
      system_role: "BUSINESS_USER",
      email_verified: data.email_verified ?? false,
    });

    const saved = await repo.save(user);

    return {
      id: saved.id,
      full_name: saved.full_name,
      email: saved.email,
      system_role: saved.system_role,
      email_verified: saved.email_verified,
      created_at: saved.created_at,
    };
  }

  static async findByGoogleId(googleId: string) {
    return AppDataSource.getRepository(User).findOne({
      where: { google_id: googleId },
      select: {
        id: true,
        full_name: true,
        email: true,
        password_hash: true,
        google_id: true,
        system_role: true,
        email_verified: true,
      },
    });
  }

  static async linkGoogleAccount(userId: string, googleId: string) {
    await AppDataSource.getRepository(User).update(
      { id: userId },
      { google_id: googleId, email_verified: true },
    );
    return this.findById(userId);
  }

  //FIND USER BY EMAIL-LOGIN
  static async findByEmail(email: string) {
    return AppDataSource.getRepository(User).findOne({
      where: { email },
      select: {
        id: true,
        full_name: true,
        email: true,
        password_hash: true,
        google_id: true,
        system_role: true,
        email_verified: true,
      },
    });
  }

  //FIND USER BY ID-middleware
  static async findById(id: string) {
    return AppDataSource.getRepository(User).findOne({
      where: { id },
      select: {
        id: true,
        full_name: true,
        email: true,
        system_role: true,
        email_verified: true,
      },
    });
  }

  static async saveEmailToken(userId: string, token: string, expiresAt: Date) {
    const repo = AppDataSource.getRepository(EmailVerificationToken);
    await repo.save(
      repo.create({
        user_id: userId,
        token,
        expires_at: expiresAt,
      }),
    );
  }

  static async findToken(token: string) {
    return AppDataSource.getRepository(EmailVerificationToken).findOne({
      where: { token },
    });
  }

  static async verifyUser(userId: string) {
    await AppDataSource.getRepository(User).update(
      { id: userId },
      { email_verified: true },
    );
  }

  static async deleteEmailToken(token: string) {
    await AppDataSource.getRepository(EmailVerificationToken).delete({ token });
  }

  static async deleteEmailTokensForUser(userId: string) {
    await AppDataSource.getRepository(EmailVerificationToken).delete({
      user_id: userId,
    });
  }

  static async savePasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ) {
    const repo = AppDataSource.getRepository(PasswordResetToken);
    await repo.delete({ user_id: userId });
    await repo.save(
      repo.create({
        user_id: userId,
        token,
        expires_at: expiresAt,
      }),
    );
  }

  static async findPasswordResetToken(token: string) {
    return AppDataSource.getRepository(PasswordResetToken).findOne({
      where: { token },
    });
  }

  static async deletePasswordResetToken(token: string) {
    await AppDataSource.getRepository(PasswordResetToken).delete({ token });
  }

  static async updatePassword(userId: string, password_hash: string) {
    await AppDataSource.getRepository(User).update(
      { id: userId },
      { password_hash },
    );
  }

  static async createSession(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
  ) {
    const repo = AppDataSource.getRepository(Session);
    return repo.save(
      repo.create({
        user_id: userId,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        revoked_at: null,
      }),
    );
  }

  static async findActiveSessionById(sessionId: string) {
    return AppDataSource.getRepository(Session).findOne({
      where: { id: sessionId, revoked_at: IsNull() },
    });
  }

  static async findActiveSessionByRefreshToken(refreshToken: string) {
    return AppDataSource.getRepository(Session).findOne({
      where: { refresh_token: refreshToken, revoked_at: IsNull() },
    });
  }

  static async revokeSession(sessionId: string) {
    await AppDataSource.getRepository(Session).update(
      { id: sessionId },
      { revoked_at: new Date() },
    );
  }

  static async revokeSessionsForUser(userId: string) {
    await AppDataSource.getRepository(Session).update(
      { user_id: userId, revoked_at: IsNull() },
      { revoked_at: new Date() },
    );
  }
}
