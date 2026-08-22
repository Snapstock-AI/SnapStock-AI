import jwt from "jsonwebtoken";
import { Response, NextFunction } from "express";

import {
  authMiddleware,
  AuthRequest,
  requireRoles,
} from "../../../src/shared/middleware/auth.middleware";
import { AuthRepository } from "../../../src/modules/auth/auth.repository";

jest.mock("../../../src/modules/auth/auth.repository", () => ({
  AuthRepository: {
    findActiveSessionById: jest.fn(),
  },
}));

const mockedRepository = AuthRepository as jest.Mocked<typeof AuthRepository>;

describe("authMiddleware", () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";

    req = {
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  it("should return 401 when no token is provided", async () => {
    await authMiddleware(req as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "No token provided",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 for invalid token format", async () => {
    req.headers = { authorization: "Token abc" };

    await authMiddleware(req as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid token format",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 when session is revoked or expired", async () => {
    const token = jwt.sign(
      {
        userId: "user-1",
        email: "test@example.com",
        system_role: "BUSINESS_USER",
        sessionId: "session-1",
      },
      "test-secret",
      { expiresIn: "1h" }
    );

    req.headers = { authorization: `Bearer ${token}` };
    mockedRepository.findActiveSessionById.mockResolvedValue(null);

    await authMiddleware(req as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Session expired or revoked",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should attach user and call next for a valid session", async () => {
    const token = jwt.sign(
      {
        userId: "user-1",
        email: "test@example.com",
        system_role: "BUSINESS_USER",
        sessionId: "session-1",
      },
      "test-secret",
      { expiresIn: "1h" }
    );

    req.headers = { authorization: `Bearer ${token}` };
    mockedRepository.findActiveSessionById.mockResolvedValue({
      id: "session-1",
      user_id: "user-1",
      refresh_token: "refresh",
      expires_at: new Date(Date.now() + 86400000),
      revoked_at: null,
      created_at: new Date(),
    } as any);

    await authMiddleware(req as AuthRequest, res as Response, next);

    expect(req.user).toEqual({
      id: "user-1",
      userId: "user-1",
      email: "test@example.com",
      system_role: "BUSINESS_USER",
      sessionId: "session-1",
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("requireRoles", () => {
  it("should return 403 when role is not allowed", () => {
    const req = {
      user: {
        id: "user-1",
        userId: "user-1",
        email: "test@example.com",
        system_role: "BUSINESS_USER",
        sessionId: "session-1",
      },
    } as AuthRequest;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const next = jest.fn();

    requireRoles("SYSTEM_ADMIN")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next when role is allowed", () => {
    const req = {
      user: {
        id: "user-1",
        userId: "user-1",
        email: "test@example.com",
        system_role: "SYSTEM_ADMIN",
        sessionId: "session-1",
      },
    } as AuthRequest;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const next = jest.fn();

    requireRoles("SYSTEM_ADMIN")(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
