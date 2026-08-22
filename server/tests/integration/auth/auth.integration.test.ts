import request from "supertest";
import jwt from "jsonwebtoken";

import app from "../../../src/app";
import { AuthService } from "../../../src/modules/auth/auth.service";
import { AuthRepository } from "../../../src/modules/auth/auth.repository";
import { DetectionService } from "../../../src/modules/detection/detection.service";

jest.mock("../../../src/modules/auth/auth.service", () => ({
  AuthService: {
    login: jest.fn(),
    logout: jest.fn(),
    refresh: jest.fn(),
    register: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

jest.mock("../../../src/modules/detection/detection.service", () => ({
  DetectionService: {
    analyze: jest.fn(),
  },
}));

jest.mock("../../../src/modules/auth/auth.repository", () => ({
  AuthRepository: {
    findActiveSessionById: jest.fn(),
  },
}));

const mockedAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockedDetectionService = DetectionService as jest.Mocked<
  typeof DetectionService
>;
const mockedRepository = AuthRepository as jest.Mocked<typeof AuthRepository>;

describe("Auth routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  describe("POST /auth/login", () => {
    it("should return tokens on successful login", async () => {
      mockedAuthService.login.mockResolvedValue({
        message: "Login successful",
        token: "access-token",
        refreshToken: "refresh-token",
        user: {
          id: "user-1",
          full_name: "Test User",
          email: "test@example.com",
          system_role: "BUSINESS_USER",
        },
      });

      const response = await request(app).post("/auth/login").send({
        email: "test@example.com",
        password: "Secret123!",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          message: "Login successful",
          token: "access-token",
          refreshToken: "refresh-token",
          user: {
            id: "user-1",
            full_name: "Test User",
            email: "test@example.com",
            system_role: "BUSINESS_USER",
          },
        },
      });
    });

    it("should return 400 on invalid credentials", async () => {
      mockedAuthService.login.mockRejectedValue(
        new Error("Invalid credentials")
      );

      const response = await request(app).post("/auth/login").send({
        email: "test@example.com",
        password: "wrong",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Invalid credentials",
      });
    });
  });

  describe("POST /auth/refresh", () => {
    it("should return rotated tokens", async () => {
      mockedAuthService.refresh.mockResolvedValue({
        message: "Token refreshed",
        token: "new-access",
        refreshToken: "new-refresh",
        user: {
          id: "user-1",
          full_name: "Test User",
          email: "test@example.com",
          system_role: "BUSINESS_USER",
        },
      });

      const response = await request(app).post("/auth/refresh").send({
        refreshToken: "old-refresh",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBe("new-access");
    });

    it("should return 401 for invalid refresh tokens", async () => {
      mockedAuthService.refresh.mockRejectedValue(
        new Error("Invalid or expired refresh token")
      );

      const response = await request(app).post("/auth/refresh").send({
        refreshToken: "bad",
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: "Invalid or expired refresh token",
      });
    });
  });

  describe("POST /auth/logout", () => {
    it("should revoke session when Authorization is valid", async () => {
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

      mockedRepository.findActiveSessionById.mockResolvedValue({
        id: "session-1",
        user_id: "user-1",
        refresh_token: "refresh",
        expires_at: new Date(Date.now() + 86400000),
        revoked_at: null,
        created_at: new Date(),
      } as any);

      mockedAuthService.logout.mockResolvedValue({
        message: "Logout successful",
      });

      const response = await request(app)
        .post("/auth/logout")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(mockedAuthService.logout).toHaveBeenCalledWith("session-1");
      expect(response.body).toEqual({
        success: true,
        data: { message: "Logout successful" },
      });
    });

    it("should return 401 without Authorization", async () => {
      const response = await request(app).post("/auth/logout");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("No token provided");
      expect(mockedAuthService.logout).not.toHaveBeenCalled();
    });
  });
});

describe("Protected detection with real auth middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  it("should reject analyze without a token", async () => {
    const response = await request(app)
      .post("/detection/analyze")
      .field("businessId", "business-123")
      .field("shelfId", "shelf-123")
      .attach("file", Buffer.from("fake-image"), "shelf.jpg");

    expect(response.status).toBe(401);
    expect(mockedDetectionService.analyze).not.toHaveBeenCalled();
  });

  it("should allow analyze with a valid session token", async () => {
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

    mockedRepository.findActiveSessionById.mockResolvedValue({
      id: "session-1",
      user_id: "user-1",
      refresh_token: "refresh",
      expires_at: new Date(Date.now() + 86400000),
      revoked_at: null,
      created_at: new Date(),
    } as any);

    mockedDetectionService.analyze.mockResolvedValue({
      scanId: "scan-1",
      image_width: 640,
      image_height: 480,
      total_count: 0,
      counts: {},
      detections: [],
    } as any);

    const response = await request(app)
      .post("/detection/analyze")
      .set("Authorization", `Bearer ${token}`)
      .field("businessId", "business-123")
      .field("shelfId", "shelf-123")
      .attach("file", Buffer.from("fake-image"), "shelf.jpg");

    expect(response.status).toBe(200);
    expect(mockedDetectionService.analyze).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: "shelf.jpg" }),
      "business-123",
      "shelf-123",
      "user-1"
    );
  });
});
