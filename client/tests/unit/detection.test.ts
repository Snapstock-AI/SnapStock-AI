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

        image_width: 452,
        image_height: 678,

        total_count: 2,

        counts: {
          apple: {
            fresh: 1,
            rotten: 0,
            total: 1,
          },
          lemon: {
            fresh: 1,
            rotten: 0,
            total: 1,
          },
        },

        detections: [
          {
            id: "detection-1",
            class_name: "apple",
            confidence: 0.9758,

            bounding_box: {
              x1: 40,
              y1: 224,
              x2: 227,
              y2: 406,
            },

            freshness: "Fresh",
            freshness_confidence: 0.9969,
            freshness_confidence_percent: 99.69,
          },
        ],
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const file = new File(
      ["fake-image"],
      "shelf.jpg",
      { type: "image/jpeg" },
    );

    const shelf = {
      id: "shelf-123",
      name: "Shelf A - Bananas",
      category: "Fruit",
    };

    const result = await analyzeImage(
      file,
      shelf,
      "business-123",
      "token-123",
    );

    
    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, options] = vi.mocked(fetch).mock.calls[0];

  
    expect(url).toContain("/detection/analyze");


    expect(options?.method).toBe("POST");

    expect(options?.headers).toEqual({
      Authorization: "Bearer token-123",
    });

 
    expect(options?.body).toBeInstanceOf(FormData);

    const formData = options?.body as FormData;

    expect(formData.get("file")).toBe(file);
    expect(formData.get("shelfId")).toBe("shelf-123");
    expect(formData.get("businessId")).toBe("business-123");

   
    expect(result.scanId).toBe("scan-123");
    expect(result.shelf).toEqual(shelf);

    expect(result.image_width).toBe(452);
    expect(result.image_height).toBe(678);

    expect(result.total_count).toBe(2);

    expect(result.counts).toEqual({
      apple: {
        fresh: 1,
        rotten: 0,
        total: 1,
      },
      lemon: {
        fresh: 1,
        rotten: 0,
        total: 1,
      },
    });

    expect(result.detections).toEqual(
      mockResponse.data.detections
    );
  });

  it("should throw an error when the API returns an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        message: "AI service unavailable",
      }),
    } as Response);

    const file = new File(
      ["fake-image"],
      "shelf.jpg",
      { type: "image/jpeg" },
    );

    const shelf = {
      id: "shelf-123",
      name: "Shelf A - Bananas",
      category: "Fruit",
    };

    await expect(
      analyzeImage(
        file,
        shelf,
        "business-123",
        "token-123",
      ),
    ).rejects.toThrow("AI service unavailable");
  });

  it("should use the default error message when API does not provide one", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
      }),
    } as Response);

    const file = new File(
      ["fake-image"],
      "shelf.jpg",
      { type: "image/jpeg" },
    );

    const shelf = {
      id: "shelf-123",
      name: "Shelf A - Bananas",
      category: "Fruit",
    };

    await expect(
      analyzeImage(
        file,
        shelf,
        "business-123",
        "token-123",
      ),
    ).rejects.toThrow("Image analysis failed");
  });
});