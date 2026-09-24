/**
 * JWT enforcement and session-token properties.
 * SRS: FR-AUTH-006, NFR-SEC-002 (secret from env, 24 h default expiry), NFR-SEC-005.
 */
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { NextFunction, Response } from "express";

import {
  authMiddleware,
  AuthRequest,
  requireRoles,
} from "../../../src/shared/middleware/auth.middleware";
import { AuthService } from "../../../src/modules/auth/auth.service";
import { AuthRepository } from "../../../src/modules/auth/auth.repository";

jest.mock("../../../src/modules/auth/auth.repository", () => ({
  AuthRepository: {
    findActiveSessionById: jest.fn(),
    findByEmail: jest.fn(),
    createSession: jest.fn(),
  },
}));
jest.mock("../../../src/modules/business/business.repository", () => ({
  BusinessRepository: { findBusinessIdByUserId: jest.fn().mockResolvedValue(null) },
}));
jest.mock("../../../src/shared/utils/email", () => ({
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

const repo = AuthRepository as jest.Mocked<typeof AuthRepository>;
const SECRET = "unit-test-secret";
const payload = {
  userId: "u1",
  email: "a@example.com",
  system_role: "BUSINESS_USER",
  sessionId: "s1",
  businessId: null,
};

function run(headers: Record<string, string>) {
  const req = { headers } as Partial<AuthRequest>;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return authMiddleware(req as AuthRequest, res, next).then(() => ({ req, res, next }));
}

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
  repo.findActiveSessionById.mockResolvedValue({
    id: "s1",
    expires_at: new Date(Date.now() + 60_000),
  } as never);
});

describe("authMiddleware rejects bad tokens with 401 and never reaches the handler", () => {
  const cases: Array<[string, () => string]> = [
    ["an expired token", () => jwt.sign(payload, SECRET, { expiresIn: -10 })],
    ["a token signed with a different secret", () => jwt.sign(payload, "attacker-secret")],
    ["a malformed token", () => "not.a.jwt"],
    [
      "an unsigned (alg=none) token",
      () =>
        [
          Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url"),
          Buffer.from(JSON.stringify(payload)).toString("base64url"),
          "",
        ].join("."),
    ],
    ["a token with no session id", () => jwt.sign({ ...payload, sessionId: undefined }, SECRET)],
  ];

  it.each(cases)("%s", async (_name, makeToken) => {
    const { res, next } = await run({ authorization: `Bearer ${makeToken()}` });

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a non-Bearer scheme", async () => {
    const { res, next } = await run({ authorization: `Basic ${jwt.sign(payload, SECRET)}` });

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("does not leak a stack trace or the verification error in the response body", async () => {
    const { res } = await run({ authorization: "Bearer garbage" });

    const body = JSON.stringify((res.json as jest.Mock).mock.calls[0][0]);
    expect(body).not.toMatch(/stack|JsonWebTokenError|at .*\.ts/i);
  });

  it("rejects a valid signature whose session has been revoked (logout enforcement)", async () => {
    repo.findActiveSessionById.mockResolvedValue(null as never);

    const { res, next } = await run({ authorization: `Bearer ${jwt.sign(payload, SECRET)}` });

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireRoles", () => {
  const call = (role: string | undefined, ...allowed: string[]) => {
    const req = { user: role ? { system_role: role } : undefined } as AuthRequest;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn();
    requireRoles(...allowed)(req, res, next);
    return { res, next };
  };

  it("denies a business user access to an admin-only guard", () => {
    const { res, next } = call("BUSINESS_USER", "SYSTEM_ADMIN");
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("denies an unauthenticated request", () => {
    const { res } = call(undefined, "SYSTEM_ADMIN");
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("issued access token (NFR-SEC-002)", () => {
  it("is signed with the environment secret and expires 24 hours after issue", async () => {
    const hash = await bcrypt.hash("Secret123", 4);
    repo.findByEmail.mockResolvedValue({
      id: "u1",
      email: "a@example.com",
      full_name: "A",
      system_role: "BUSINESS_USER",
      password_hash: hash,
      email_verified: true,
    } as never);
    repo.createSession.mockResolvedValue({ id: "s1" } as never);

    const result = await AuthService.login({ email: "a@example.com", password: "Secret123" });

    const claims = jwt.verify(result.token, SECRET) as jwt.JwtPayload;
    expect(claims.exp! - claims.iat!).toBe(24 * 60 * 60);
    expect(() => jwt.verify(result.token, "some-other-secret")).toThrow();
  });

  it("does not put the password hash or refresh token inside the JWT", async () => {
    const hash = await bcrypt.hash("Secret123", 4);
    repo.findByEmail.mockResolvedValue({
      id: "u1",
      email: "a@example.com",
      full_name: "A",
      system_role: "BUSINESS_USER",
      password_hash: hash,
      email_verified: true,
    } as never);
    repo.createSession.mockResolvedValue({ id: "s1" } as never);

    const result = await AuthService.login({ email: "a@example.com", password: "Secret123" });

    const claims = jwt.decode(result.token) as Record<string, unknown>;
    expect(Object.keys(claims)).not.toEqual(
      expect.arrayContaining(["password_hash", "refreshToken"]),
    );
    expect(JSON.stringify(claims)).not.toContain(hash);
  });
});
