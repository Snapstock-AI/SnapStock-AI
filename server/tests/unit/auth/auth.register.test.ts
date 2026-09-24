/**
 * Registration, verification and password-reset rules.
 * SRS: FR-AUTH-001, FR-AUTH-004, FR-AUTH-005, NFR-SEC-002.
 *
 * Tests marked `it.failing` document a confirmed deviation from the SRS. They
 * pass while the defect exists and turn red as soon as it is fixed, prompting
 * removal of the marker. Each carries a KNOWN DEFECT id (see docs/testing).
 */
import bcrypt from "bcrypt";

import { AuthService } from "../../../src/modules/auth/auth.service";
import { AuthRepository } from "../../../src/modules/auth/auth.repository";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../../../src/shared/utils/email";

jest.mock("../../../src/modules/auth/auth.repository", () => ({
  AuthRepository: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    createUser: jest.fn(),
    saveEmailToken: jest.fn(),
    findToken: jest.fn(),
    verifyUser: jest.fn(),
    deleteEmailToken: jest.fn(),
    savePasswordResetToken: jest.fn(),
    findPasswordResetToken: jest.fn(),
    updatePassword: jest.fn(),
    deletePasswordResetToken: jest.fn(),
    revokeSessionsForUser: jest.fn(),
  },
}));

jest.mock("../../../src/shared/utils/email", () => ({
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock("../../../src/modules/business/business.repository", () => ({
  BusinessRepository: { findBusinessIdByUserId: jest.fn() },
}));

const repo = AuthRepository as jest.Mocked<typeof AuthRepository>;
const verificationMail = sendVerificationEmail as jest.Mock;
const resetMail = sendPasswordResetEmail as jest.Mock;

const validInput = {
  full_name: "Nimal Perera",
  email: "nimal@example.com",
  password: "Fresh2024",
};

const HOUR_MS = 60 * 60 * 1000;

describe("AuthService.register (FR-AUTH-001)", () => {
  beforeEach(() => {
    repo.findByEmail.mockResolvedValue(null);
    repo.createUser.mockImplementation(async (d: any) => ({
      id: "user-1",
      full_name: d.full_name,
      email: d.email,
    }));
  });

  it("stores only a bcrypt hash with cost >= 10, never the plaintext password", async () => {
    await AuthService.register(validInput);

    const stored = repo.createUser.mock.calls[0][0] as any;
    expect(stored.password_hash).not.toBe(validInput.password);
    expect(stored.password_hash).toMatch(/^\$2[aby]\$/);
    expect(bcrypt.getRounds(stored.password_hash)).toBeGreaterThanOrEqual(10);
    expect(await bcrypt.compare(validInput.password, stored.password_hash)).toBe(true);
  });

  it("issues a random verification token that expires in one hour and mails it", async () => {
    const before = Date.now();
    await AuthService.register(validInput);

    const [userId, token, expiresAt] = repo.saveEmailToken.mock.calls[0];
    expect(userId).toBe("user-1");
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(expiresAt.getTime() - before).toBeGreaterThan(HOUR_MS - 5000);
    expect(expiresAt.getTime() - before).toBeLessThan(HOUR_MS + 5000);
    expect(verificationMail).toHaveBeenCalledWith("nimal@example.com", token);
  });

  it("rejects an already registered email without creating a user or sending mail", async () => {
    repo.findByEmail.mockResolvedValue({ id: "existing" } as any);

    await expect(AuthService.register(validInput)).rejects.toThrow(/already exists/i);
    expect(repo.createUser).not.toHaveBeenCalled();
    expect(verificationMail).not.toHaveBeenCalled();
  });

  it.each([
    ["shorter than 8 characters", "Ab1"],
    ["without a digit", "abcdefghij"],
    ["without a letter", "1234567890"],
    ["empty", ""],
  ])("rejects a password %s and writes nothing", async (_label, password) => {
    await expect(AuthService.register({ ...validInput, password })).rejects.toThrow(
      /password/i,
    );
    expect(repo.createUser).not.toHaveBeenCalled();
    expect(repo.saveEmailToken).not.toHaveBeenCalled();
  });

  it("normalises the email to lowercase before lookup and storage", async () => {
    await AuthService.register({ ...validInput, email: "Nimal@Example.COM" });

    expect(repo.findByEmail).toHaveBeenCalledWith("nimal@example.com");
    expect((repo.createUser.mock.calls[0][0] as any).email).toBe("nimal@example.com");
  });

  // KNOWN DEFECT TD-01: SRS A3 says SMTP failure must keep the account and let
  // the user resend; today the exception aborts registration with a 400.
  it.failing("keeps the account when the SMTP send fails (FR-AUTH-001 A3)", async () => {
    verificationMail.mockRejectedValueOnce(new Error("SMTP down"));

    await expect(AuthService.register(validInput)).resolves.toBeDefined();
  });
});

describe("AuthService.verifyEmail (FR-AUTH-004)", () => {
  it("rejects an expired token and does not verify the user", async () => {
    repo.findToken.mockResolvedValue({
      user_id: "user-1",
      expires_at: new Date(Date.now() - 1000),
    } as any);

    await expect(AuthService.verifyEmail("t")).rejects.toThrow(/expired/i);
    expect(repo.verifyUser).not.toHaveBeenCalled();
  });

  it("marks the user verified and consumes the token (single use)", async () => {
    repo.findToken.mockResolvedValue({
      user_id: "user-1",
      expires_at: new Date(Date.now() + HOUR_MS),
    } as any);
    repo.findById.mockResolvedValue({ id: "user-1", email_verified: false } as any);

    await AuthService.verifyEmail("t");

    expect(repo.verifyUser).toHaveBeenCalledWith("user-1");
    expect(repo.deleteEmailToken).toHaveBeenCalledWith("t");
  });

  it("rejects an unknown token", async () => {
    repo.findToken.mockResolvedValue(null);
    await expect(AuthService.verifyEmail("nope")).rejects.toThrow(/invalid or expired/i);
  });
});

describe("password reset (FR-AUTH-005)", () => {
  it("answers identically whether or not the account exists (no enumeration)", async () => {
    repo.findByEmail.mockResolvedValueOnce(null);
    const unknown = await AuthService.forgotPassword({ email: "ghost@example.com" });

    repo.findByEmail.mockResolvedValueOnce({
      id: "user-1",
      email: "nimal@example.com",
      password_hash: "x",
    } as any);
    const known = await AuthService.forgotPassword({ email: "nimal@example.com" });

    expect(known).toEqual(unknown);
    expect(resetMail).toHaveBeenCalledTimes(1);
  });

  it("creates a one-hour reset token", async () => {
    repo.findByEmail.mockResolvedValue({
      id: "user-1",
      email: "nimal@example.com",
      password_hash: "x",
    } as any);
    const before = Date.now();

    await AuthService.forgotPassword({ email: "nimal@example.com" });

    const expiresAt = repo.savePasswordResetToken.mock.calls[0][2] as Date;
    expect(expiresAt.getTime() - before).toBeGreaterThan(HOUR_MS - 5000);
    expect(expiresAt.getTime() - before).toBeLessThanOrEqual(HOUR_MS + 5000);
  });

  it("rejects an expired token without changing the password", async () => {
    repo.findPasswordResetToken.mockResolvedValue({
      user_id: "user-1",
      expires_at: new Date(Date.now() - 1000),
    } as any);

    await expect(
      AuthService.resetPassword({ token: "t", password: "Fresh2024" }),
    ).rejects.toThrow(/expired/i);
    expect(repo.updatePassword).not.toHaveBeenCalled();
  });

  it("consumes the token after a successful reset so it cannot be replayed", async () => {
    repo.findPasswordResetToken.mockResolvedValueOnce({
      user_id: "user-1",
      expires_at: new Date(Date.now() + HOUR_MS),
    } as any);

    await AuthService.resetPassword({ token: "t", password: "Fresh2024" });
    expect(repo.deletePasswordResetToken).toHaveBeenCalledWith("t");

    repo.findPasswordResetToken.mockResolvedValueOnce(null);
    await expect(
      AuthService.resetPassword({ token: "t", password: "Another2024" }),
    ).rejects.toThrow(/invalid or expired/i);
  });

  it("applies the password policy to the new password and changes nothing when it fails", async () => {
    repo.findPasswordResetToken.mockResolvedValue({
      user_id: "user-1",
      expires_at: new Date(Date.now() + HOUR_MS),
    } as any);

    await expect(
      AuthService.resetPassword({ token: "t", password: "short" }),
    ).rejects.toThrow(/password/i);
    expect(repo.updatePassword).not.toHaveBeenCalled();
    expect(repo.deletePasswordResetToken).not.toHaveBeenCalled();
  });
});
