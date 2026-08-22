import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeImage } from "../../src/lib/detection";

describe("analyzeImage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should send the image, shelf ID, business ID and token", async () => {
    const mockResponse = {
      success: true,
      data: {
        scanId: "scan-123",
        image_width: 640,
        image_height: 480,
        total_count: 2,
        counts: {
          Apple: 1,
          Banana: 1,
        },
        detections: [],
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const file = new File(["fake-image"], "shelf.jpg", { type: "image/jpeg" });

    const shelf = {
      id: "shelf-123",
      name: "Shelf A - Bananas",
      category: "Fruit",
    };

    const result = await analyzeImage(file, shelf, "business-123", "token-123");

    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, options] = vi.mocked(fetch).mock.calls[0];

    expect(url).toContain("/detection/analyze");

    expect(options?.method).toBe("POST");

    expect(options?.headers).toEqual({
      Authorization: "Bearer token-123",
    });

    expect(options?.body).toBeInstanceOf(FormData);

    expect(result.scanId).toBe("scan-123");
    expect(result.shelf).toEqual(shelf);
    expect(result.total_count).toBe(2);
  });

  it("should throw an error when the API returns an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        message: "AI service unavailable",
      }),
    } as Response);

    const file = new File(["fake-image"], "shelf.jpg", { type: "image/jpeg" });

    const shelf = {
      id: "shelf-123",
      name: "Shelf A - Bananas",
      category: "Fruit",
    };

    await expect(
      analyzeImage(file, shelf, "business-123", "token-123"),
    ).rejects.toThrow("AI service unavailable");
  });

  it("should use the default error message when API does not provide one", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
      }),
    } as Response);

    const file = new File(["fake-image"], "shelf.jpg", { type: "image/jpeg" });

    const shelf = {
      id: "shelf-123",
      name: "Shelf A - Bananas",
      category: "Fruit",
    };

    await expect(
      analyzeImage(file, shelf, "business-123", "token-123"),
    ).rejects.toThrow("Image analysis failed");
  });
});
