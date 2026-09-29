/**
 * Shelf scan end to end in the browser: the real AuthProvider (signed-in session from
 * storage), ScansPage and the detection/shelf API helpers all run; only the network
 * (fetch) is replaced by a fake backend that answers with the backend's scan result shape.
 * SRS: FR-SCAN-004, FR-FRESH-001/003, FR-INV-002, NFR-USE-005.
 */
import { createContext, useContext, type ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router";

import { AuthProvider } from "../../src/context/AuthContext";
import ScansPage from "../../src/pages/dashboard/ScansPage";
import type { DetectionResult } from "../../src/lib/detection";

vi.mock("../../src/components/scanner/CameraScanner", () => ({ default: () => null }));

// Radix Select cannot be driven reliably in jsdom; a native <select> keeps the page's
// own logic (value, disabled state, onValueChange) under test.
vi.mock("@/components/ui/select", () => {
  type SelectState = { value?: string; disabled?: boolean; onValueChange?: (value: string) => void };
  const SelectContext = createContext<SelectState>({});
  return {
    Select: ({ children, ...state }: SelectState & { children: ReactNode }) => (
      <SelectContext.Provider value={state}>{children}</SelectContext.Provider>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: ReactNode }) => {
      const state = useContext(SelectContext);
      return (
        <select
          aria-label="Correct state"
          value={state.value}
          disabled={state.disabled}
          onChange={(event) => state.onValueChange?.(event.target.value)}
        >
          {children}
        </select>
      );
    },
    SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
      <option value={value}>{children}</option>
    ),
  };
});

const SHELF = { id: "shelf-1", name: "Fruit shelf", category: "Fruit" };

/** What POST /detection/analyze returns once the backend has processed the AI response. */
const SCAN_RESULT: DetectionResult = {
  scanId: "scan-1",
  image_width: 640,
  image_height: 480,
  total_count: 3,
  counts: {
    apple: { fresh: 1, rotten: 1, total: 2 },
    orange: { fresh: 1, rotten: 0, total: 1 },
  },
  detections: [
    { id: "detection-1", class_name: "apple", confidence: 0.94, bounding_box: { x1: 12, y1: 20, x2: 118, y2: 210 }, freshness: "Fresh", freshness_confidence: 0.91, freshness_confidence_percent: 91 },
    { id: "detection-2", class_name: "apple", confidence: 0.88, bounding_box: { x1: 140, y1: 32, x2: 240, y2: 220 }, freshness: "Spoiled", freshness_confidence: 0.77, freshness_confidence_percent: 77 },
    { id: "detection-3", class_name: "orange", confidence: 0.81, bounding_box: { x1: 300, y1: 60, x2: 400, y2: 180 }, freshness: "Fresh", freshness_confidence: 0.69, freshness_confidence_percent: 69 },
  ],
  inventoryChanges: [
    { productId: "product-apple", product: "apple", detected: 2, currentQuantity: 5, quantity: 7 },
    { productId: "product-orange", product: "orange", detected: 1, currentQuantity: 0, quantity: 1 },
  ],
};

type FakeResponse = { status?: number; body: unknown };
type Handler = (init: RequestInit) => FakeResponse;

/** Fake backend: "METHOD /path" -> handler. Unknown routes fail the test loudly. */
let routes: Record<string, Handler>;
const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = new URL(String(input));
  const key = `${init.method ?? "GET"} ${url.pathname}`;
  const handler = routes[key];
  if (!handler) throw new Error(`Unexpected request: ${key}`);
  const { status = 200, body } = handler(init);
  return {
    ok: status >= 200 && status < 300,
    status,
    url: url.toString(),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
});

function callsTo(key: string) {
  return fetchMock.mock.calls
    .filter(([input, init]) => `${init?.method ?? "GET"} ${new URL(String(input)).pathname}` === key)
    .map(([input, init]) => ({ url: new URL(String(input)), init: init ?? {} }));
}

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <ScansPage />
      </MemoryRouter>
    </AuthProvider>,
  );
}

async function scanShelf({ mode }: { mode?: "Remove Stock" } = {}) {
  const shelfSelect = await screen.findByLabelText("Select a Shelf");
  await waitFor(() => expect(shelfSelect).not.toBeDisabled());
  if (mode) fireEvent.click(screen.getByRole("button", { name: mode }));
  fireEvent.change(shelfSelect, { target: { value: SHELF.id } });
  const file = new File(["image-bytes"], "shelf.jpg", { type: "image/jpeg" });
  fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
    target: { files: [file] },
  });
  fireEvent.click(await screen.findByRole("button", { name: "Analyze" }));
  return file;
}

beforeAll(() => {
  // jsdom has no object URLs; the page only uses them for the image preview.
  if (!URL.createObjectURL) URL.createObjectURL = () => "blob:preview";
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("snapstock_token", "token-1");
  localStorage.setItem(
    "snapstock_user",
    JSON.stringify({ id: "user-1", full_name: "Nimal", email: "nimal@example.com", system_role: "USER", businessId: "biz-1", businessRole: "OWNER" }),
  );
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  routes = {
    "GET /shelves": () => ({ body: { success: true, data: [SHELF] } }),
    "GET /detection/history": () => ({ body: { success: true, data: [] } }),
    "POST /detection/analyze": () => ({ body: { success: true, data: SCAN_RESULT } }),
  };
});

afterEach(() => vi.unstubAllGlobals());

describe("loading the scan page", () => {
  it("loads the signed-in business's shelves and scan history with the session token", async () => {
    renderPage();

    expect(await screen.findByRole("option", { name: "Fruit shelf (Fruit)" })).toBeInTheDocument();
    const [shelves] = callsTo("GET /shelves");
    expect(shelves.url.searchParams.get("businessId")).toBe("biz-1");
    expect(shelves.init.headers).toMatchObject({ Authorization: "Bearer token-1" });
    const [history] = callsTo("GET /detection/history");
    expect(history.url.searchParams.get("businessId")).toBe("biz-1");
  });
});

describe("scanning a shelf", () => {
  it("uploads the photo with the shelf, business and scan mode, then shows the result", async () => {
    renderPage();
    const file = await scanShelf();

    expect(await screen.findByText("Scan Result")).toBeInTheDocument();
    const [analyze] = callsTo("POST /detection/analyze");
    expect(analyze.init.headers).toEqual({ Authorization: "Bearer token-1" });
    const form = analyze.init.body as FormData;
    expect(form.get("file")).toBe(file);
    expect(form.get("shelfId")).toBe("shelf-1");
    expect(form.get("businessId")).toBe("biz-1");
    expect(form.get("scanMode")).toBe("STOCK_IN");
  });

  it("shows totals, per-item freshness with confidence, and per-product counts", async () => {
    renderPage();
    await scanShelf();

    expect(await screen.findByText("Shelf: Fruit shelf")).toBeInTheDocument();
    expect(screen.getByText("Total Detected Items").parentElement).toHaveTextContent("3items detected");
    expect(screen.getByText("Model freshness: Fresh (91% confidence)")).toBeInTheDocument();
    expect(screen.getByText("Model freshness: Spoiled (77% confidence)")).toBeInTheDocument();
    expect(screen.getByText("Model freshness: Fresh (69% confidence)")).toBeInTheDocument();

    const appleCard = screen.getByRole("heading", { level: 4, name: "apple" }).parentElement as HTMLElement;
    expect(within(appleCard).getByText("Total").nextElementSibling).toHaveTextContent("2");
    expect(within(appleCard).getByText("Fresh").nextElementSibling).toHaveTextContent("1");
    expect(within(appleCard).getByText("Rotten").nextElementSibling).toHaveTextContent("1");
  });

  it("shows the stock added for each product", async () => {
    renderPage();
    await scanShelf();

    expect(await screen.findByText("Stock added")).toBeInTheDocument();
    expect(screen.getByText("Current 5 · Detected 2 · New stock 7")).toBeInTheDocument();
    expect(screen.getByText("Current 0 · Detected 1 · New stock 1")).toBeInTheDocument();
  });

  it("sends a STOCK_OUT scan and shows the stock removed in Remove Stock mode", async () => {
    routes["POST /detection/analyze"] = () => ({
      body: {
        success: true,
        data: { ...SCAN_RESULT, inventoryChanges: [{ productId: "product-apple", product: "apple", detected: 2, currentQuantity: 7, quantity: 5 }] },
      },
    });
    renderPage();
    await scanShelf({ mode: "Remove Stock" });

    expect(await screen.findByText("Stock removed")).toBeInTheDocument();
    expect(screen.getByText("Current 7 · Detected 2 · New stock 5")).toBeInTheDocument();
    expect((callsTo("POST /detection/analyze")[0].init.body as FormData).get("scanMode")).toBe("STOCK_OUT");
  });

  it("shows the backend's error message when the scan fails", async () => {
    routes["POST /detection/analyze"] = () => ({
      status: 400,
      body: { success: false, message: "No matching inventory products found for: apple. Add stock first before removing." },
    });
    renderPage();
    await scanShelf();

    expect(
      await screen.findByText("No matching inventory products found for: apple. Add stock first before removing."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Scan Result")).not.toBeInTheDocument();
  });
});

describe("correcting a detection's freshness", () => {
  it("saves the correction to the backend and updates the result on screen", async () => {
    routes["PATCH /detection/detection-2/freshness"] = () => ({
      body: { success: true, data: { id: "detection-2", freshness: "Medium", corrected_freshness: "Medium" } },
    });
    renderPage();
    await scanShelf();
    await screen.findByText("Scan Result");

    fireEvent.change(screen.getAllByLabelText("Correct state")[1], { target: { value: "Medium" } });

    expect(await screen.findByText("Model freshness: Medium (77% confidence)")).toBeInTheDocument();
    const [patch] = callsTo("PATCH /detection/detection-2/freshness");
    expect(patch.init.headers).toMatchObject({ Authorization: "Bearer token-1" });
    expect(JSON.parse(String(patch.init.body))).toEqual({ freshness: "Medium" });
  });

  it("keeps the original freshness and shows the error when the correction is refused", async () => {
    routes["PATCH /detection/detection-2/freshness"] = () => ({
      status: 400,
      body: { success: false, message: "You do not belong to this business." },
    });
    renderPage();
    await scanShelf();
    await screen.findByText("Scan Result");

    fireEvent.change(screen.getAllByLabelText("Correct state")[1], { target: { value: "Medium" } });

    expect(await screen.findByText("You do not belong to this business.")).toBeInTheDocument();
    expect(screen.getByText("Model freshness: Spoiled (77% confidence)")).toBeInTheDocument();
  });
});
