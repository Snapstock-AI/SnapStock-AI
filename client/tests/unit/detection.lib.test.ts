/**
 * Client-side detection API helpers beyond analyzeImage's basic request
 * (covered in detection.test.ts): scan mode, scan history, freshness correction.
 * SRS: FR-SCAN-004, FR-FRESH-003, FR-INV-002.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  analyzeImage,
  countHistoryItems,
  formatHistoryDate,
  getScanHistory,
  updateDetectionFreshness,
} from "../../src/lib/detection";

const SHELF = { id: "shelf-1", name: "Fruit shelf" } as never;

let fetchMock: ReturnType<typeof vi.fn>;

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
}

function lastRequest() {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url: String(url), init: (init ?? {}) as RequestInit & { headers: Record<string, string> } };
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("analyzeImage scan mode", () => {
  const file = new File(["img"], "shelf.jpg", { type: "image/jpeg" });

  it("sends STOCK_IN by default", async () => {
    respond(200, { success: true, data: { scanId: "s1" } });

    await analyzeImage(file, SHELF, "biz-1", "token-1");

    const body = lastRequest().init.body as FormData;
    expect(body.get("scanMode")).toBe("STOCK_IN");
  });

  it("sends STOCK_OUT when removing stock", async () => {
    respond(200, { success: true, data: { scanId: "s1" } });

    await analyzeImage(file, SHELF, "biz-1", "token-1", "STOCK_OUT");

    const body = lastRequest().init.body as FormData;
    expect(body.get("scanMode")).toBe("STOCK_OUT");
    expect(body.get("shelfId")).toBe("shelf-1");
    expect(body.get("businessId")).toBe("biz-1");
  });

  it("treats a 200 response with success=false as a failure", async () => {
    respond(200, { success: false, message: "No matching inventory products found for: kiwi." });

    await expect(analyzeImage(file, SHELF, "biz-1", "token-1", "STOCK_OUT")).rejects.toThrow(
      "No matching inventory products found for: kiwi.",
    );
  });
});

describe("getScanHistory", () => {
  it("requests the business's history with the token", async () => {
    respond(200, { success: true, data: [{ id: "scan-1" }] });

    const result = await getScanHistory("biz-1", "token-1");

    const { url, init } = lastRequest();
    expect(url).toMatch(/\/detection\/history\?businessId=biz-1$/);
    expect(init.headers.Authorization).toBe("Bearer token-1");
    expect(result).toEqual([{ id: "scan-1" }]);
  });

  it("adds the date range when given", async () => {
    respond(200, { success: true, data: [] });

    await getScanHistory("biz-1", "token-1", "2026-09-01", "2026-09-30");

    const params = new URL(lastRequest().url).searchParams;
    expect(params.get("businessId")).toBe("biz-1");
    expect(params.get("startDate")).toBe("2026-09-01");
    expect(params.get("endDate")).toBe("2026-09-30");
  });

  it("returns an empty list when the server sends no data", async () => {
    respond(200, { success: true });

    await expect(getScanHistory("biz-1", "token-1")).resolves.toEqual([]);
  });

  it("surfaces the server's message on failure", async () => {
    respond(403, { success: false, message: "You do not belong to this business" });

    await expect(getScanHistory("biz-1", "token-1")).rejects.toThrow("You do not belong to this business");
  });

  it("uses a default message when the server gives none", async () => {
    respond(500, {});

    await expect(getScanHistory("biz-1", "token-1")).rejects.toThrow("Unable to load scan history.");
  });
});

describe("updateDetectionFreshness (manual correction)", () => {
  it("sends a PATCH with the new freshness and the token", async () => {
    respond(200, { success: true, data: { id: "d1", freshness: "Medium" } });

    const result = await updateDetectionFreshness("d1", "Medium", "token-1");

    const { url, init } = lastRequest();
    expect(url).toMatch(/\/detection\/d1\/freshness$/);
    expect(init.method).toBe("PATCH");
    expect(init.headers.Authorization).toBe("Bearer token-1");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(String(init.body))).toEqual({ freshness: "Medium" });
    expect(result).toEqual({ id: "d1", freshness: "Medium" });
  });

  it("surfaces the server's message on failure", async () => {
    respond(400, { success: false, message: "Freshness must be Fresh, Medium, or Spoiled." });

    await expect(updateDetectionFreshness("d1", "Fresh", "token-1")).rejects.toThrow(
      "Freshness must be Fresh, Medium, or Spoiled.",
    );
  });

  it("uses a default message when the server gives none", async () => {
    respond(500, {});

    await expect(updateDetectionFreshness("d1", "Spoiled", "token-1")).rejects.toThrow(
      "Unable to update freshness.",
    );
  });
});

describe("history display helpers", () => {
  it("countHistoryItems counts detected items per product type", () => {
    expect(
      countHistoryItems([
        { type: "apple", freshness: "Fresh" },
        { type: "apple", freshness: "Spoiled" },
        { type: "orange", freshness: "Fresh" },
      ]),
    ).toEqual({ apple: 2, orange: 1 });
  });

  it("countHistoryItems returns an empty object for a scan with no items", () => {
    expect(countHistoryItems([])).toEqual({});
  });

});

describe("formatHistoryDate", () => {
  // Local dates, so the expectations hold in any time zone.
  const NOW = new Date(2026, 8, 28, 12, 0);
  const time = (date: Date) =>
    date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows 'Today' with the time for a scan made today", () => {
    const scan = new Date(2026, 8, 28, 9, 14);

    expect(formatHistoryDate(scan)).toBe(`Today, ${time(scan)}`);
  });

  it("shows 'Yesterday' with the time for a scan made yesterday", () => {
    const scan = new Date(2026, 8, 27, 15, 25);

    expect(formatHistoryDate(scan)).toBe(`Yesterday, ${time(scan)}`);
  });

  it("shows the month and day, without the year, for an earlier date this year", () => {
    const scan = new Date(2026, 2, 5, 8, 0);
    const day = scan.toLocaleDateString(undefined, { month: "short", day: "numeric" });

    expect(formatHistoryDate(scan)).toBe(`${day}, ${time(scan)}`);
    expect(formatHistoryDate(scan)).not.toMatch(/2026/);
  });

  it("includes the year for a date in an earlier year", () => {
    const scan = new Date(2025, 11, 31, 18, 45);

    expect(formatHistoryDate(scan)).toMatch(/2025/);
  });

  it("accepts the database format 'YYYY-MM-DD HH:mm:ss' as well as ISO", () => {
    expect(formatHistoryDate("2026-09-28 09:14:00")).toBe(formatHistoryDate("2026-09-28T09:14:00"));
    expect(formatHistoryDate("2026-09-28 09:14:00")).toMatch(/^Today, /);
  });

  it("returns an empty string for a missing value and the original text for an unreadable one", () => {
    expect(formatHistoryDate(null)).toBe("");
    expect(formatHistoryDate(undefined)).toBe("");
    expect(formatHistoryDate("not a date")).toBe("not a date");
  });
});
