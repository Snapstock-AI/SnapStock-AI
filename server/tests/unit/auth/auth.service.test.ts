import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { AuthService } from "../../../src/modules/auth/auth.service";
import { AuthRepository } from "../../../src/modules/auth/auth.repository";
import { BusinessRepository } from "../../../src/modules/business/business.repository";
import { InvitationService } from "../../../src/modules/business/invitation.service";

jest.mock("../../../src/modules/auth/auth.repository", () => ({
  AuthRepository: {
    findByEmail: jest.fn(),
    findByEmailIncludingDeleted: jest.fn(),
    findById: jest.fn(),
    createUser: jest.fn(),
    createSession: jest.fn(),
    revokeSession: jest.fn(),
    revokeSessionsForUser: jest.fn(),
    findActiveSessionByRefreshToken: jest.fn(),
    findPasswordResetToken: jest.fn(),
    updatePassword: jest.fn(),
    deletePasswordResetToken: jest.fn(),
    saveEmailToken: jest.fn(),
    savePasswordResetToken: jest.fn(),
    findToken: jest.fn(),
    verifyUser: jest.fn(),
    deleteEmailToken: jest.fn(),
    deleteEmailTokensForUser: jest.fn(),
  },
}));

jest.mock("../../../src/shared/utils/email", () => ({
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock("../../../src/modules/business/business.repository", () => ({
  BusinessRepository: {
    findBusinessMembershipByUserId: jest.fn(),
  },
}));

jest.mock("../../../src/modules/business/invitation.service", () => ({
  InvitationService: {
    hasPendingInvitation: jest.fn(),
  },
}));

const mockedRepository = AuthRepository as jest.Mocked<typeof AuthRepository>;
const mockedBusinessRepository = BusinessRepository as jest.Mocked<typeof BusinessRepository>;
const mockedInvitationService = InvitationService as jest.Mocked<typeof InvitationService>;

describe("AuthService", () => {
  const password = "Secret123!";
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 4);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    mockedBusinessRepository.findBusinessMembershipByUserId.mockResolvedValue(null as never);
    mockedInvitationService.hasPendingInvitation.mockResolvedValue(false);
  });

  describe("login", () => {
    it("rejects an invited employee who has not accepted the invitation yet", async () => {
      mockedRepository.findByEmailIncludingDeleted.mockResolvedValue({
        id: "employee-1",
        full_name: "Employee",
        email: "employee@example.com",
        password_hash: passwordHash,
        system_role: "BUSINESS_USER",
        email_verified: true,
        must_change_password: true,
      } as any);
      mockedInvitationService.hasPendingInvitation.mockResolvedValue(true);

      await expect(
        AuthService.login({ email: "employee@example.com", password }),
      ).rejects.toThrow(
        "Please accept the invitation sent to your email before signing in.",
      );
      expect(mockedRepository.createSession).not.toHaveBeenCalled();
    });

    it("should create a session and return access + refresh tokens", async () => {
      mockedRepository.findByEmailIncludingDeleted.mockResolvedValue({
        id: "user-1",
        full_name: "Test User",
        email: "test@example.com",
        password_hash: passwordHash,
        system_role: "BUSINESS_USER",
        email_verified: true,
      } as any);

      mockedRepository.createSession.mockResolvedValue({
        id: "session-1",
        user_id: "user-1",
        refresh_token: "unused",
        expires_at: new Date(Date.now() + 86400000),
        revoked_at: null,
        created_at: new Date(),
      } as any);

      const result = await AuthService.login({
        email: "test@example.com",
        password,
      });

      expect(mockedRepository.createSession).toHaveBeenCalledWith(
        "user-1",
        expect.any(String),
        expect.any(Date)
      );

      expect(result.message).toBe("Login successful");
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.user).toEqual({
        id: "user-1",
        full_name: "Test User",
        email: "test@example.com",
        system_role: "BUSINESS_USER",
      });

      const decoded = jwt.verify(result.token, "test-secret") as {
        userId: string;
        sessionId: string;
        system_role: string;
      };

      expect(decoded.userId).toBe("user-1");
      expect(decoded.sessionId).toBe("session-1");
      expect(decoded.system_role).toBe("BUSINESS_USER");
    });

    it("rejects a removed (soft-deleted) employee", async () => {
      mockedRepository.findByEmailIncludingDeleted.mockResolvedValue({
        id: "employee-1",
        full_name: "Removed Employee",
        email: "removed@example.com",
        password_hash: passwordHash,
        system_role: "BUSINESS_USER",
        email_verified: true,
        deleted_at: new Date(),
      } as any);

      await expect(
        AuthService.login({ email: "removed@example.com", password }),
      ).rejects.toThrow("This account has been removed");
      expect(mockedRepository.createSession).not.toHaveBeenCalled();
    });

    it("does not reveal removal when the password is wrong", async () => {
      mockedRepository.findByEmailIncludingDeleted.mockResolvedValue({
        id: "employee-1",
        email: "removed@example.com",
        password_hash: passwordHash,
        email_verified: true,
        deleted_at: new Date(),
      } as any);

      await expect(
        AuthService.login({ email: "removed@example.com", password: "wrong" }),
      ).rejects.toThrow("Invalid credentials");
    });

    it("should reject invalid credentials", async () => {
      mockedRepository.findByEmailIncludingDeleted.mockResolvedValue(null);

      await expect(
        AuthService.login({
          email: "missing@example.com",
          password,
        })
      ).rejects.toThrow("Invalid credentials");

      expect(mockedRepository.createSession).not.toHaveBeenCalled();
    });

    it("should reject unverified users", async () => {
      mockedRepository.findByEmailIncludingDeleted.mockResolvedValue({
        id: "user-1",
        full_name: "Test User",
        email: "test@example.com",
        password_hash: passwordHash,
        system_role: "BUSINESS_USER",
        email_verified: false,
      } as any);

      await expect(
        AuthService.login({
          email: "test@example.com",
          password,
        })
      ).rejects.toThrow("Please verify your email first");

      expect(mockedRepository.createSession).not.toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("should revoke the session when sessionId is provided", async () => {
      mockedRepository.revokeSession.mockResolvedValue(undefined as any);

      const result = await AuthService.logout("session-1");

      expect(mockedRepository.revokeSession).toHaveBeenCalledWith("session-1");
      expect(result).toEqual({ message: "Logout successful" });
    });

    it("should succeed without revoking when sessionId is missing", async () => {
      const result = await AuthService.logout();

      expect(mockedRepository.revokeSession).not.toHaveBeenCalled();
      expect(result).toEqual({ message: "Logout successful" });
    });
  });

  describe("refresh", () => {
    it("should rotate session tokens", async () => {
      mockedRepository.findActiveSessionByRefreshToken.mockResolvedValue({
        id: "session-old",
        user_id: "user-1",
        refresh_token: "refresh-old",
        expires_at: new Date(Date.now() + 86400000),
        revoked_at: null,
        created_at: new Date(),
      } as any);

      mockedRepository.findById.mockResolvedValue({
        id: "user-1",
        full_name: "Test User",
        email: "test@example.com",
        system_role: "BUSINESS_USER",
        email_verified: true,
      } as any);

      mockedRepository.revokeSession.mockResolvedValue(undefined as any);

      mockedRepository.createSession.mockResolvedValue({
        id: "session-new",
        user_id: "user-1",
        refresh_token: "unused",
        expires_at: new Date(Date.now() + 86400000),
        revoked_at: null,
        created_at: new Date(),
      } as any);

      const result = await AuthService.refresh({
        refreshToken: "refresh-old",
      });

      expect(mockedRepository.revokeSession).toHaveBeenCalledWith("session-old");
      expect(mockedRepository.createSession).toHaveBeenCalled();
      expect(result.message).toBe("Token refreshed");
      expect(result.refreshToken).toEqual(expect.any(String));

      const decoded = jwt.verify(result.token, "test-secret") as {
        sessionId: string;
      };
      expect(decoded.sessionId).toBe("session-new");
    });

    it("should reject invalid refresh tokens", async () => {
      mockedRepository.findActiveSessionByRefreshToken.mockResolvedValue(null);

      await expect(
        AuthService.refresh({ refreshToken: "bad" })
      ).rejects.toThrow("Invalid or expired refresh token");
    });
  });

  describe("resetPassword", () => {
    it("should update password and revoke all sessions", async () => {
      mockedRepository.findPasswordResetToken.mockResolvedValue({
        id: "prt-1",
        user_id: "user-1",
        token: "reset-token",
        expires_at: new Date(Date.now() + 3600000),
        created_at: new Date(),
      } as any);

      mockedRepository.updatePassword.mockResolvedValue(undefined as any);
      mockedRepository.deletePasswordResetToken.mockResolvedValue(
        undefined as any
      );
      mockedRepository.revokeSessionsForUser.mockResolvedValue(undefined as any);

      const result = await AuthService.resetPassword({
        token: "reset-token",
        password: "NewSecret123!",
      });

      expect(mockedRepository.updatePassword).toHaveBeenCalledWith(
        "user-1",
        expect.any(String)
      );
      expect(mockedRepository.revokeSessionsForUser).toHaveBeenCalledWith(
        "user-1"
      );
      expect(result).toEqual({ message: "Password reset successfully" });
    });
  });
});
