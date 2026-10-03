import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { AuthService } from "../../../src/modules/auth/auth.service";
import { AuthRepository } from "../../../src/modules/auth/auth.repository";
import { BusinessRepository } from "../../../src/modules/business/business.repository";
import { sendVerificationEmail } from "../../../src/shared/utils/email";

jest.mock("../../../src/modules/auth/auth.repository", () => ({
  AuthRepository: {
    findByEmail: jest.fn(),
    findByEmailIncludingDeleted: jest.fn(),
    findById: jest.fn(),
    createUser: jest.fn(),
    updateFullName: jest.fn(),
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
    findMembership: jest.fn(),
    findById: jest.fn(),
  },
}));

const mockedRepository = AuthRepository as jest.Mocked<typeof AuthRepository>;
const mockedBusinessRepository = BusinessRepository as jest.Mocked<typeof BusinessRepository>;
const mockedSendVerificationEmail = sendVerificationEmail as jest.Mock;

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
    mockedBusinessRepository.findById.mockResolvedValue({ status: "ACTIVE" } as never);
  });

  describe("register", () => {
    it("should create a new account when the email is unused", async () => {
      mockedRepository.findByEmailIncludingDeleted.mockResolvedValue(null);
      mockedRepository.createUser.mockResolvedValue({
        id: "user-1",
        full_name: "New User",
        email: "new@example.com",
        system_role: "BUSINESS_USER",
        email_verified: false,
      } as any);

      const result = await AuthService.register({
        full_name: "New User",
        email: "new@example.com",
        password,
      });

      expect(mockedRepository.createUser).toHaveBeenCalled();
      expect(mockedSendVerificationEmail).toHaveBeenCalledWith("new@example.com", expect.any(String));
      expect(result.message).toContain("registered successfully");
    });

    it("should reject when the email belongs to an already-verified account", async () => {
      mockedRepository.findByEmailIncludingDeleted.mockResolvedValue({
        id: "user-1",
        email: "taken@example.com",
        email_verified: true,
        deleted_at: null,
      } as any);

      await expect(
        AuthService.register({
          full_name: "Someone",
          email: "taken@example.com",
          password,
        }),
      ).rejects.toThrow("User already exists");

      expect(mockedRepository.createUser).not.toHaveBeenCalled();
    });

    it("should reject when the email belongs to a deleted account", async () => {
      mockedRepository.findByEmailIncludingDeleted.mockResolvedValue({
        id: "user-1",
        email: "gone@example.com",
        email_verified: false,
        deleted_at: new Date(),
      } as any);

      await expect(
        AuthService.register({
          full_name: "Someone",
          email: "gone@example.com",
          password,
        }),
      ).rejects.toThrow("This email is no longer available.");
    });

    it("should let an unverified account retry signup instead of blocking it", async () => {
      mockedRepository.findByEmailIncludingDeleted.mockResolvedValue({
        id: "user-1",
        email: "pending@example.com",
        full_name: "Old Name",
        email_verified: false,
        deleted_at: null,
      } as any);

      const result = await AuthService.register({
        full_name: "Updated Name",
        email: "pending@example.com",
        password,
      });

      expect(mockedRepository.createUser).not.toHaveBeenCalled();
      expect(mockedRepository.updateFullName).toHaveBeenCalledWith("user-1", "Updated Name");
      expect(mockedRepository.updatePassword).toHaveBeenCalledWith("user-1", expect.any(String));
      expect(mockedRepository.deleteEmailTokensForUser).toHaveBeenCalledWith("user-1");
      expect(mockedRepository.saveEmailToken).toHaveBeenCalledWith(
        "user-1",
        expect.any(String),
        expect.any(Date),
      );
      expect(mockedSendVerificationEmail).toHaveBeenCalledWith("pending@example.com", expect.any(String));
      expect(result.message).toContain("resent the verification email");
    });
  });

  describe("register", () => {
    it("should create a new account when the email is unused", async () => {
      mockedRepository.findByEmailIncludingDeleted.mockResolvedValue(null);
      mockedRepository.createUser.mockResolvedValue({
        id: "user-1",
        full_name: "New User",
        email: "new@example.com",
        system_role: "BUSINESS_USER",
        email_verified: false,
      } as any);

      const result = await AuthService.register({
        full_name: "New User",
        email: "new@example.com",
        password,
      });

      expect(mockedRepository.createUser).toHaveBeenCalled();
      expect(mockedSendVerificationEmail).toHaveBeenCalledWith("new@example.com", expect.any(String));
      expect(result.message).toContain("registered successfully");
    });

    it("should reject when the email belongs to an already-verified account", async () => {
      mockedRepository.findByEmailIncludingDeleted.mockResolvedValue({
        id: "user-1",
        email: "taken@example.com",
        email_verified: true,
        deleted_at: null,
      } as any);

      await expect(
        AuthService.register({
          full_name: "Someone",
          email: "taken@example.com",
          password,
        }),
      ).rejects.toThrow("User already exists");

      expect(mockedRepository.createUser).not.toHaveBeenCalled();
    });

    it("should reject when the email belongs to a deleted account", async () => {
      mockedRepository.findByEmailIncludingDeleted.mockResolvedValue({
        id: "user-1",
        email: "gone@example.com",
        email_verified: false,
        deleted_at: new Date(),
      } as any);

      await expect(
        AuthService.register({
          full_name: "Someone",
          email: "gone@example.com",
          password,
        }),
      ).rejects.toThrow("This email is no longer available.");
    });

    it("should let an unverified account retry signup instead of blocking it", async () => {
      mockedRepository.findByEmailIncludingDeleted.mockResolvedValue({
        id: "user-1",
        email: "pending@example.com",
        full_name: "Old Name",
        email_verified: false,
        deleted_at: null,
      } as any);

      const result = await AuthService.register({
        full_name: "Updated Name",
        email: "pending@example.com",
        password,
      });

      expect(mockedRepository.createUser).not.toHaveBeenCalled();
      expect(mockedRepository.updateFullName).toHaveBeenCalledWith("user-1", "Updated Name");
      expect(mockedRepository.updatePassword).toHaveBeenCalledWith("user-1", expect.any(String));
      expect(mockedRepository.deleteEmailTokensForUser).toHaveBeenCalledWith("user-1");
      expect(mockedRepository.saveEmailToken).toHaveBeenCalledWith(
        "user-1",
        expect.any(String),
        expect.any(Date),
      );
      expect(mockedSendVerificationEmail).toHaveBeenCalledWith("pending@example.com", expect.any(String));
      expect(result.message).toContain("resent the verification email");
    });
  });

  describe("login", () => {
    it("should create a session and return access + refresh tokens", async () => {
      mockedRepository.findByEmail.mockResolvedValue({
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
        must_change_password: undefined,
        businessId: null,
        businessRole: null,
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

    it("should reject invalid credentials", async () => {
      mockedRepository.findByEmail.mockResolvedValue(null);

      await expect(
        AuthService.login({
          email: "missing@example.com",
          password,
        })
      ).rejects.toThrow("Invalid credentials");

      expect(mockedRepository.createSession).not.toHaveBeenCalled();
    });

    it("should reject unverified users", async () => {
      mockedRepository.findByEmail.mockResolvedValue({
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

    it("should reject login when the user's business is suspended", async () => {
      mockedRepository.findByEmail.mockResolvedValue({
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

      mockedBusinessRepository.findBusinessMembershipByUserId.mockResolvedValue({
        businessId: "business-1",
        role: "OWNER",
      } as never);
      mockedBusinessRepository.findById.mockResolvedValue({
        id: "business-1",
        status: "SUSPENDED",
      } as never);

      await expect(
        AuthService.login({
          email: "test@example.com",
          password,
        })
      ).rejects.toThrow("Your business account has been suspended");
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

  describe("switchBusiness", () => {
    it("re-issues tokens for a business the user belongs to", async () => {
      mockedRepository.findActiveSessionById = jest.fn().mockResolvedValue({
        id: "session-1",
        user_id: "user-1",
        expires_at: new Date(Date.now() + 86400000),
        revoked_at: null,
      } as any);
      mockedRepository.findById.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        system_role: "BUSINESS_USER",
        full_name: "Test User",
        must_change_password: false,
      } as any);
      mockedRepository.revokeSession.mockResolvedValue(undefined as any);
      mockedRepository.createSession.mockResolvedValue({
        id: "session-2",
        user_id: "user-1",
        refresh_token: "unused",
        expires_at: new Date(Date.now() + 86400000),
        revoked_at: null,
        created_at: new Date(),
      } as any);
      mockedBusinessRepository.findMembership.mockResolvedValue({
        business_id: "biz-2",
        role: "EMPLOYEE",
      } as never);

      const result = await AuthService.switchBusiness("session-1", "biz-2");

      expect(mockedBusinessRepository.findMembership).toHaveBeenCalledWith(
        "user-1",
        "biz-2",
      );
      expect(result.user.businessId).toBe("biz-2");
      expect(result.user.businessRole).toBe("EMPLOYEE");
    });

    it("rejects switching to a business the user is not a member of", async () => {
      mockedRepository.findActiveSessionById = jest.fn().mockResolvedValue({
        id: "session-1",
        user_id: "user-1",
        expires_at: new Date(Date.now() + 86400000),
        revoked_at: null,
      } as any);
      mockedBusinessRepository.findMembership.mockResolvedValue(null as never);

      await expect(
        AuthService.switchBusiness("session-1", "biz-x"),
      ).rejects.toThrow("You do not belong to this business");
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
