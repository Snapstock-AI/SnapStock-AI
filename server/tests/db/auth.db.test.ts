/**
 * Authentication flows against a real PostgreSQL (only SMTP is replaced).
 * SRS: FR-AUTH-001..006, NFR-SEC-002 (bcrypt, single-use time-limited tokens).
 */
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

import { AppDataSource } from "../../src/config/data-source";
import { AuthService } from "../../src/modules/auth/auth.service";
import { authMiddleware } from "../../src/shared/middleware/auth.middleware";
import { pool } from "./helpers";

jest.mock("../../src/shared/utils/email", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

import { sendPasswordResetEmail, sendVerificationEmail } from "../../src/shared/utils/email";

const PASSWORD = "Fresh2024";
const uniqueEmail = () => `User-${randomUUID().slice(0, 8)}@Example.test`;

beforeAll(async () => {
  await AppDataSource.initialize();
});
afterAll(async () => {
  await AppDataSource.destroy();
  await pool.end();
});

async function registerAndVerify(email = uniqueEmail()) {
  await AuthService.register({ full_name: "Test User", email, password: PASSWORD });
  const token = (sendVerificationEmail as jest.Mock).mock.calls.at(-1)![1] as string;
  await AuthService.verifyEmail(token);
  return { email: email.toLowerCase(), token };
}

describe("registration (FR-AUTH-001)", () => {
  it("persists a lowercase email, a bcrypt hash (cost >= 10) and an unverified account", async () => {
    const email = uniqueEmail();
    await AuthService.register({ full_name: "Test User", email, password: PASSWORD });

    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    expect(rows).toHaveLength(1);
    expect(rows[0].password_hash).not.toContain(PASSWORD);
    expect(bcrypt.getRounds(rows[0].password_hash)).toBeGreaterThanOrEqual(10);
    expect(await bcrypt.compare(PASSWORD, rows[0].password_hash)).toBe(true);
    expect(rows[0].email_verified).toBe(false);
    expect(rows[0].system_role).toBe("BUSINESS_USER");
  });

  it("rejects a duplicate email in any letter case and leaves a single row", async () => {
    const email = uniqueEmail();
    await AuthService.register({ full_name: "First", email, password: PASSWORD });

    await expect(
      AuthService.register({ full_name: "Second", email: email.toUpperCase(), password: PASSWORD }),
    ).rejects.toThrow(/already exists/i);

    const { rows } = await pool.query("SELECT 1 FROM users WHERE email = $1", [email.toLowerCase()]);
    expect(rows).toHaveLength(1);
  });

  it("stores a verification token that expires within one hour", async () => {
    const email = uniqueEmail();
    await AuthService.register({ full_name: "T", email, password: PASSWORD });

    const { rows } = await pool.query(
      `SELECT t.expires_at FROM email_verification_tokens t JOIN users u ON u.id = t.user_id WHERE u.email = $1`,
      [email.toLowerCase()],
    );
    const ms = new Date(rows[0].expires_at).getTime() - Date.now();
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(60 * 60 * 1000 + 5000);
  });
});

describe("email verification and login (FR-AUTH-002, FR-AUTH-004)", () => {
  it("blocks login until the email is verified, then allows it and consumes the token", async () => {
    const email = uniqueEmail();
    await AuthService.register({ full_name: "T", email, password: PASSWORD });
    const token = (sendVerificationEmail as jest.Mock).mock.calls.at(-1)![1] as string;

    await expect(AuthService.login({ email: email.toLowerCase(), password: PASSWORD })).rejects.toThrow(/verify your email/i);

    await AuthService.verifyEmail(token);
    const session = await AuthService.login({ email: email.toLowerCase(), password: PASSWORD });
    expect(session.token).toEqual(expect.any(String));

    await expect(AuthService.verifyEmail(token)).rejects.toThrow(/invalid or expired/i);
  });

  it("gives the same error for an unknown email and a wrong password", async () => {
    const { email } = await registerAndVerify();

    const wrongPassword = await AuthService.login({ email, password: "Wrong2024" }).catch((e) => e.message);
    const unknownUser = await AuthService.login({ email: "nobody@example.test", password: PASSWORD }).catch((e) => e.message);

    expect(wrongPassword).toBe("Invalid credentials");
    expect(unknownUser).toBe(wrongPassword);
  });

  it("rejects an expired verification token", async () => {
    const email = uniqueEmail();
    await AuthService.register({ full_name: "T", email, password: PASSWORD });
    const token = (sendVerificationEmail as jest.Mock).mock.calls.at(-1)![1] as string;
    await pool.query("UPDATE email_verification_tokens SET expires_at = NOW() - INTERVAL '1 minute' WHERE token = $1", [token]);

    await expect(AuthService.verifyEmail(token)).rejects.toThrow(/expired/i);
    const { rows } = await pool.query("SELECT email_verified FROM users WHERE email = $1", [email.toLowerCase()]);
    expect(rows[0].email_verified).toBe(false);
  });
});

describe("session lifecycle (FR-AUTH-003, FR-AUTH-006)", () => {
  it("a token stops working after logout (session revoked server-side)", async () => {
    const { email } = await registerAndVerify();
    const session = await AuthService.login({ email, password: PASSWORD });
    const sessionId = (jwt.decode(session.token) as { sessionId: string }).sessionId;

    const outcome = async () => {
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      await authMiddleware({ headers: { authorization: `Bearer ${session.token}` } } as never, res as never, next);
      return { status: res.status.mock.calls[0]?.[0], next };
    };

    expect((await outcome()).next).toHaveBeenCalled();
    await AuthService.logout(sessionId);
    const after = await outcome();
    expect(after.status).toBe(401);
    expect(after.next).not.toHaveBeenCalled();
  });

  it("a refresh token is single use: rotation revokes the old session", async () => {
    const { email } = await registerAndVerify();
    const first = await AuthService.login({ email, password: PASSWORD });

    await AuthService.refresh({ refreshToken: first.refreshToken });

    await expect(AuthService.refresh({ refreshToken: first.refreshToken })).rejects.toThrow(/invalid or expired/i);
  });
});

describe("password reset (FR-AUTH-005)", () => {
  it("changes the password, revokes every session and cannot be replayed", async () => {
    const { email } = await registerAndVerify();
    const session = await AuthService.login({ email, password: PASSWORD });
    await AuthService.forgotPassword({ email });
    const token = (sendPasswordResetEmail as jest.Mock).mock.calls.at(-1)![1] as string;

    await AuthService.resetPassword({ token, password: "Newer2024" });

    await expect(AuthService.login({ email, password: PASSWORD })).rejects.toThrow(/invalid credentials/i);
    expect((await AuthService.login({ email, password: "Newer2024" })).token).toEqual(expect.any(String));
    await expect(AuthService.refresh({ refreshToken: session.refreshToken })).rejects.toThrow();
    await expect(AuthService.resetPassword({ token, password: "Another2024" })).rejects.toThrow(/invalid or expired/i);
  });

  it("does not store the reset password in plaintext", async () => {
    const { email } = await registerAndVerify();
    await AuthService.forgotPassword({ email });
    const token = (sendPasswordResetEmail as jest.Mock).mock.calls.at(-1)![1] as string;
    await AuthService.resetPassword({ token, password: "Newer2024" });

    const { rows } = await pool.query("SELECT password_hash FROM users WHERE email = $1", [email]);
    expect(rows[0].password_hash).not.toContain("Newer2024");
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
  });
});
