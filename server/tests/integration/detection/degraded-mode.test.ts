/**
 * Degraded mode when the AI service is unavailable.
 * SRS: FR-HEALTH-002, FR-SCAN-004 A2, NFR-SEC-005 (no internal details leaked).
 *
 * Expected flow: AI down -> scan request -> controlled API error (code AI_UNAVAILABLE)
 * -> scan marked FAILED -> inventory untouched -> other endpoints keep working.
 */
import axios from "axios";
import request from "supertest";

import app from "../../../src/app";
import { DetectionService } from "../../../src/modules/detection/detection.service";
import { DetectionRepository } from "../../../src/modules/detection/detection.repository";

jest.mock("axios");
jest.mock("../../../src/modules/detection/detection.repository", () => ({
  DetectionRepository: {
    createScan: jest.fn(),
    updateScanStatus: jest.fn(),
    findProductByName: jest.fn(),
    createDetection: jest.fn(),
    applyInventoryChange: jest.fn(),
  },
}));
jest.mock("../../../src/modules/business/business.service", () => ({
  BusinessService: { assertMember: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("../../../src/shared/middleware/auth.middleware", () => ({
  authMiddleware: jest.fn((req, _res, next) => {
    req.user = { id: "user-123" };
    next();
  }),
}));

const http = axios as jest.Mocked<typeof axios>;
const repo = DetectionRepository as jest.Mocked<typeof DetectionRepository>;

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);

function axiosFailure(code: string, message: string) {
  return Object.assign(new Error(message), { code, isAxiosError: true });
}

const submit = () =>
  request(app)
    .post("/detection/analyze")
    .field("businessId", "b1")
    .field("shelfId", "s1")
    .attach("file", JPEG, "shelf.jpg");

beforeEach(() => {
  jest.clearAllMocks();
  process.env.AI_SERVICE_URL = "http://10.0.0.5:8000";
  repo.createScan.mockResolvedValue({ id: "scan-1" } as never);
  repo.updateScanStatus.mockResolvedValue({} as never);
});

describe.each([
  ["connection refused", axiosFailure("ECONNREFUSED", "connect ECONNREFUSED 10.0.0.5:8000")],
  ["timeout", axiosFailure("ECONNABORTED", "timeout of 30000ms exceeded")],
  ["host not found", axiosFailure("ENOTFOUND", "getaddrinfo ENOTFOUND ai-service")],
])("AI service failure: %s", (_label, failure) => {
  beforeEach(() => http.post.mockRejectedValue(failure));

  it("returns 503 with code AI_UNAVAILABLE and a safe, user-readable message", async () => {
    const res = await submit();

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ success: false, code: "AI_UNAVAILABLE" });
    expect(res.body.message).toMatch(/temporarily unavailable/i);
  });

  it("does not leak the AI host, port or raw socket error", async () => {
    const res = await submit();

    expect(res.text).not.toMatch(/10\.0\.0\.5|8000|ECONN|ENOTFOUND|getaddrinfo|timeout of/);
  });

  it("marks the scan FAILED and never touches inventory or detections", async () => {
    await submit();

    expect(repo.updateScanStatus).toHaveBeenLastCalledWith("scan-1", "FAILED", expect.any(String));
    expect(repo.createDetection).not.toHaveBeenCalled();
    expect(repo.applyInventoryChange).not.toHaveBeenCalled();
  });

  it("keeps unrelated endpoints available (health is served while AI is down)", async () => {
    await submit();

    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
  });
});

describe("AI call configuration", () => {
  it("sets a request timeout so a hung AI service cannot block the API indefinitely", async () => {
    http.post.mockRejectedValue(axiosFailure("ECONNABORTED", "timeout"));

    await DetectionService.analyze(
      { buffer: JPEG, originalname: "s.jpg", mimetype: "image/jpeg" } as Express.Multer.File,
      "b1",
      "s1",
      "u1",
    ).catch(() => undefined);

    const options = http.post.mock.calls[0][2] as { timeout?: number };
    expect(options.timeout).toBeGreaterThan(0);
  });
});

describe("failure after AI success rolls back to a FAILED scan (FR-SCAN-004 A3)", () => {
  beforeEach(() => {
    http.post.mockResolvedValue({
      data: { image_width: 10, image_height: 10, total_count: 0, counts: {}, detections: [] },
    });
    repo.applyInventoryChange.mockRejectedValue(new Error('deadlock detected in relation "products"'));
  });

  it("marks the scan FAILED when the inventory transaction throws and returns an error status", async () => {
    const res = await submit();

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(repo.updateScanStatus).toHaveBeenLastCalledWith("scan-1", "FAILED", expect.any(String));
  });

  // KNOWN DEFECT TD-03: controllers return error.message verbatim, so database
  // internals reach the client (NFR-SEC-005). Remove `.failing` once fixed.
  it.failing("does not expose database internals in the response body", async () => {
    const res = await submit();

    expect(res.text).not.toMatch(/deadlock|relation "products"/);
  });
});
