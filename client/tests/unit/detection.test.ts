import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeImage, analyzeImageSync } from "../../src/lib/detection";

const shelf = {
  id: "shelf-123",
  name: "Shelf A - Bananas",
  category: "Fruit",
};

const result = {
  scanId: "scan-123",
  image_width: 452,
  image_height: 678,
  total_count: 2,
  counts: {
    apple: { fresh: 1, rotten: 0, total: 1 },
    lemon: { fresh: 1, rotten: 0, total: 1 },
  },
  detections: [
    {
      id: "detection-1",
      class_name: "apple",
      confidence: 0.9758,
      bounding_box: { x1: 40, y1: 224, x2: 227, y2: 406 },
      freshness: "Fresh",
      freshness_confidence: 0.9969,
      freshness_confidence_percent: 99.69,
    },
  ],
  inventoryChanges: [],
};

const json = (body: unknown, ok = true, status = ok ? 200 : 400) =>
  ({ ok, status, json: async () => body }) as Response;

const newFile = () => new File(["fake-image"], "shelf.jpg", { type: "image/jpeg" });

const ticket = {
  success: true,
  data: {
    scanId: "scan-123",
    upload: {
      url: "https://s3.example/scan-bucket",
      fields: { key: "scans/business-123/scan-123/shelf.jpg", "Content-Type": "image/jpeg", Policy: "p" },
    },
  },
};

describe("analyzeImage (event-driven)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads to S3, queues the scan and polls until the result is stored", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json(ticket, true, 201))
      .mockResolvedValueOnce({ ok: true, status: 204 } as Response)
      .mockResolvedValueOnce(json({ success: true, data: { scanId: "scan-123", status: "PROCESSING" } }, true, 202))
      .mockResolvedValueOnce(json({ success: true, data: { scanId: "scan-123", status: "PROCESSING", data: null } }))
      .mockResolvedValueOnce(json({ success: true, data: { scanId: "scan-123", status: "COMPLETED", data: result } }));

    const file = newFile();
    const stages: string[] = [];

    const analysis = await analyzeImage(file, shelf, "business-123", "token-123", "STOCK_OUT", {
      pollIntervalMs: 0,
      onProgress: (stage) => stages.push(stage),
    });

    expect(analysis).toEqual(result);
    expect(stages).toEqual(["uploading", "queued", "analyzing"]);

    const [ticketUrl, ticketInit] = fetchMock.mock.calls[0];
    expect(ticketUrl).toContain("/detection/upload-url");
    expect(JSON.parse(String(ticketInit?.body))).toEqual({
      businessId: "business-123",
      shelfId: "shelf-123",
      scanMode: "STOCK_OUT",
      fileName: "shelf.jpg",
      contentType: "image/jpeg",
    });
    expect(ticketInit?.headers).toMatchObject({ Authorization: "Bearer token-123" });

    // Direct browser -> S3 upload: presigned fields first, file last, no API token.
    const [s3Url, s3Init] = fetchMock.mock.calls[1];
    expect(s3Url).toBe("https://s3.example/scan-bucket");
    const form = s3Init?.body as FormData;
    expect([...form.keys()]).toEqual(["key", "Content-Type", "Policy", "file"]);
    expect(form.get("file")).toBe(file);
    expect(s3Init?.headers).toBeUndefined();

    const [queueUrl, queueInit] = fetchMock.mock.calls[2];
    expect(queueUrl).toContain("/detection/queue");
    expect(JSON.parse(String(queueInit?.body))).toEqual({ scanId: "scan-123" });

    expect(String(fetchMock.mock.calls[3][0])).toContain("/detection/status/scan-123");
  });

  it("throws the worker's error when the scan FAILED", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json(ticket, true, 201))
      .mockResolvedValueOnce({ ok: true, status: 204 } as Response)
      .mockResolvedValueOnce(json({ success: true, data: { status: "PROCESSING" } }, true, 202))
      .mockResolvedValueOnce(
        json({ success: true, data: { scanId: "scan-123", status: "FAILED", data: null, errorMessage: "Invalid image file." } }),
      );

    await expect(
      analyzeImage(newFile(), shelf, "business-123", "token-123", "STOCK_IN", { pollIntervalMs: 0 }),
    ).rejects.toThrow("Invalid image file.");
  });

  it("reports a rejected S3 upload clearly", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json(ticket, true, 201))
      .mockResolvedValueOnce({ ok: false, status: 400 } as Response);

    await expect(analyzeImage(newFile(), shelf, "business-123", "token-123")).rejects.toThrow(
      /rejected by storage/,
    );
  });

  it("times out instead of polling forever", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json(ticket, true, 201))
      .mockResolvedValueOnce({ ok: true, status: 204 } as Response)
      .mockResolvedValueOnce(json({ success: true, data: { status: "PROCESSING" } }, true, 202))
      .mockResolvedValue(json({ success: true, data: { scanId: "scan-123", status: "PROCESSING", data: null } }));

    await expect(
      analyzeImage(newFile(), shelf, "business-123", "token-123", "STOCK_IN", {
        pollIntervalMs: 0,
        timeoutMs: 20,
      }),
    ).rejects.toThrow(/taking longer than expected/);
  });

  it("falls back to synchronous analysis when the pipeline is disabled", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        json({ success: false, code: "EVENT_PIPELINE_DISABLED", message: "not configured" }, false, 503),
      )
      .mockResolvedValueOnce(json({ success: true, data: result }));

    await expect(analyzeImage(newFile(), shelf, "business-123", "token-123")).resolves.toEqual(result);
    expect(String(fetchMock.mock.calls[1][0])).toContain("/detection/analyze");
  });

  it("surfaces backend errors from the upload request", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      json({ success: false, message: "You do not belong to this business." }, false, 403),
    );

    await expect(analyzeImage(newFile(), shelf, "business-123", "token-123")).rejects.toThrow(
      "You do not belong to this business.",
    );
  });
});

describe("analyzeImageSync", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should send the image, shelf ID, business ID and token", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ success: true, data: result }));

    const file = newFile();
    const analysis = await analyzeImageSync(file, shelf, "business-123", "token-123");

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/detection/analyze");
    expect(options?.method).toBe("POST");
    expect(options?.headers).toEqual({ Authorization: "Bearer token-123" });

    const formData = options?.body as FormData;
    expect(formData.get("file")).toBe(file);
    expect(formData.get("shelfId")).toBe("shelf-123");
    expect(formData.get("businessId")).toBe("business-123");

    expect(analysis).toEqual(result);
  });

  it("should throw an error when the API returns an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json({ success: false, message: "AI service unavailable" }, false),
    );

    await expect(analyzeImageSync(newFile(), shelf, "business-123", "token-123")).rejects.toThrow(
      "AI service unavailable",
    );
  });

  it("should use the default error message when API does not provide one", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ success: false }, false));

    await expect(analyzeImageSync(newFile(), shelf, "business-123", "token-123")).rejects.toThrow(
      "Image analysis failed",
    );
  });
});
