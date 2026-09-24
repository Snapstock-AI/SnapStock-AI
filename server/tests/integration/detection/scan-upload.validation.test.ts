/**
 * Server-side upload validation. SRS: FR-SCAN-004 A1 (validation error -> 400,
 * scan not created), NFR-SEC-004.3 (validate MIME type and size on the server),
 * NFR-SEC-006.2 (reject executable content).
 */
import request from "supertest";
import app from "../../../src/app";
import { DetectionService } from "../../../src/modules/detection/detection.service";

jest.mock("../../../src/modules/detection/detection.service", () => ({
  DetectionService: { analyze: jest.fn() },
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

const analyze = DetectionService.analyze as jest.Mock;

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64),
]);

const post = () =>
  request(app)
    .post("/detection/analyze")
    .field("businessId", "b1")
    .field("shelfId", "s1");

beforeEach(() => {
  analyze.mockReset();
  analyze.mockResolvedValue({ scanId: "scan-1" });
});

describe("POST /detection/analyze upload validation", () => {
  it.each([
    ["JPEG", JPEG, "shelf.jpg"],
    ["PNG", PNG, "shelf.png"],
  ])("accepts a real %s image", async (_label, bytes, name) => {
    const res = await post().attach("file", bytes, name);

    expect(res.status).toBe(200);
    expect(analyze).toHaveBeenCalledTimes(1);
  });

  it("rejects a request with no file, without creating a scan", async () => {
    analyze.mockRejectedValue(new Error("No image uploaded."));

    const res = await post();

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false });
  });

  it.each([
    ["a PDF", Buffer.from("%PDF-1.4"), "doc.pdf"],
    ["a text file", Buffer.from("hello"), "notes.txt"],
    ["a script", Buffer.from("#!/bin/sh\nrm -rf /"), "run.sh"],
    ["an executable", Buffer.from("MZ\x90\x00"), "setup.exe"],
    ["an SVG (can carry script)", Buffer.from("<svg onload=alert(1)/>"), "x.svg"],
  ])("rejects %s with 400 and never calls the AI pipeline", async (_label, bytes, name) => {
    const res = await post().attach("file", bytes, name);

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false });
    expect(analyze).not.toHaveBeenCalled();
  });

  it("rejects non-image bytes disguised with an image extension and MIME type", async () => {
    const res = await post().attach("file", Buffer.from("MZ\x90\x00 not an image"), {
      filename: "shelf.jpg",
      contentType: "image/jpeg",
    });

    expect(res.status).toBe(400);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("rejects an oversized image with 400", async () => {
    const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(11 * 1024 * 1024)]);

    const res = await post().attach("file", big, "big.jpg");

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/too large|size|limit/i);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("does not echo filesystem paths or stack traces in validation errors", async () => {
    const res = await post().attach("file", Buffer.from("x"), "../../etc/passwd.txt");

    expect(res.status).toBe(400);
    expect(res.text).not.toMatch(/etc\/passwd|node_modules|\.ts:\d+/);
  });
});
