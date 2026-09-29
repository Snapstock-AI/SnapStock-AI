/**
 * ScansPage: how the page uses and displays the detection response.
 * Scan mode, inventory change, per-item freshness and manual correction, retry after
 * a failure, and the scan history list.
 * SRS: FR-SCAN-004, FR-FRESH-001/003, FR-INV-002, NFR-USE-005.
 *
 * The shelf/camera/upload flow is covered in ScansPage.test.tsx.
 */
import { createContext, useContext, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router";

import ScansPage from "../../src/pages/dashboard/ScansPage";
import {
  analyzeImage,
  getScanHistory,
  updateDetectionFreshness,
  type DetectionResult,
  type ScanHistoryItem,
} from "../../src/lib/detection";
import { getShelves } from "../../src/lib/shelf";

vi.mock("../../src/lib/detection", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/lib/detection")>();
  return {
    ...actual,
    analyzeImage: vi.fn(),
    getScanHistory: vi.fn(),
    updateDetectionFreshness: vi.fn(),
  };
});
vi.mock("../../src/lib/shelf", () => ({ getShelves: vi.fn() }));
vi.mock("../../src/context/AuthContext", () => ({
  useAuth: () => ({ token: "test-token", user: { businessId: "biz-1" } }),
}));
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

function result(overrides: Partial<DetectionResult> = {}): DetectionResult {
  return {
    scanId: "scan-1",
    image_width: 640,
    image_height: 480,
    total_count: 1,
    counts: { apple: { fresh: 1, rotten: 0, total: 1 } },
    detections: [
      {
        id: "detection-1",
        class_name: "apple",
        confidence: 0.95,
        bounding_box: { x1: 1, y1: 2, x2: 3, y2: 4 },
        freshness: "Fresh",
        freshness_confidence: 0.9,
        freshness_confidence_percent: 90,
      },
    ],
    inventoryChanges: [],
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ScansPage />
    </MemoryRouter>,
  );
}

async function selectShelfAndUpload() {
  const shelfSelect = await screen.findByLabelText("Select a Shelf");
  await waitFor(() => expect(shelfSelect).not.toBeDisabled());
  fireEvent.change(shelfSelect, { target: { value: SHELF.id } });
  const file = new File(["image"], "shelf.jpg", { type: "image/jpeg" });
  fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
    target: { files: [file] },
  });
  return file;
}

async function analyze() {
  fireEvent.click(await screen.findByRole("button", { name: "Analyze" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getShelves).mockResolvedValue([SHELF] as never);
  vi.mocked(getScanHistory).mockResolvedValue([]);
});

describe("scan mode", () => {
  it("starts in Add Stock mode", async () => {
    renderPage();

    expect(await screen.findByRole("button", { name: "Add Stock" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Remove Stock" })).toHaveAttribute("aria-pressed", "false");
  });

  it("Remove Stock sends a STOCK_OUT scan", async () => {
    vi.mocked(analyzeImage).mockResolvedValue(result());
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Remove Stock" }));
    const file = await selectShelfAndUpload();
    await analyze();

    await waitFor(() =>
      expect(analyzeImage).toHaveBeenCalledWith(file, SHELF, "biz-1", "test-token", "STOCK_OUT"),
    );
    expect(screen.getByRole("button", { name: "Remove Stock" })).toHaveAttribute("aria-pressed", "true");
  });

  it("switching back to Add Stock sends STOCK_IN", async () => {
    vi.mocked(analyzeImage).mockResolvedValue(result());
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Remove Stock" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Stock" }));
    await selectShelfAndUpload();
    await analyze();

    await waitFor(() => expect(vi.mocked(analyzeImage).mock.calls[0][4]).toBe("STOCK_IN"));
  });
});

describe("inventory change from the scan", () => {
  const change = { productId: "p1", product: "apple", detected: 3, currentQuantity: 10, quantity: 13 };

  it("shows 'Stock added' with current, detected and new stock after an Add Stock scan", async () => {
    vi.mocked(analyzeImage).mockResolvedValue(result({ inventoryChanges: [change] }));
    renderPage();

    await selectShelfAndUpload();
    await analyze();

    expect(await screen.findByText("Stock added")).toBeInTheDocument();
    expect(screen.getByText("Current 10 · Detected 3 · New stock 13")).toBeInTheDocument();
  });

  it("shows 'Stock removed' after a Remove Stock scan", async () => {
    vi.mocked(analyzeImage).mockResolvedValue(
      result({ inventoryChanges: [{ ...change, quantity: 7 }] }),
    );
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Remove Stock" }));
    await selectShelfAndUpload();
    await analyze();

    expect(await screen.findByText("Stock removed")).toBeInTheDocument();
    expect(screen.getByText("Current 10 · Detected 3 · New stock 7")).toBeInTheDocument();
  });

  it("shows one line per product that changed", async () => {
    vi.mocked(analyzeImage).mockResolvedValue(
      result({
        inventoryChanges: [change, { productId: "p2", product: "orange", detected: 2, currentQuantity: 0, quantity: 2 }],
      }),
    );
    renderPage();

    await selectShelfAndUpload();
    await analyze();

    expect(await screen.findByText("Current 0 · Detected 2 · New stock 2")).toBeInTheDocument();
    expect(screen.getByText("Current 10 · Detected 3 · New stock 13")).toBeInTheDocument();
  });

  it("shows no stock panel when the scan changed nothing", async () => {
    vi.mocked(analyzeImage).mockResolvedValue(result({ inventoryChanges: [] }));
    renderPage();

    await selectShelfAndUpload();
    await analyze();

    expect(await screen.findByText("Scan Result")).toBeInTheDocument();
    expect(screen.queryByText("Stock added")).not.toBeInTheDocument();
  });
});

describe("detected items", () => {
  it("shows each item's model freshness and confidence", async () => {
    vi.mocked(analyzeImage).mockResolvedValue(result());
    renderPage();

    await selectShelfAndUpload();
    await analyze();

    expect(await screen.findByText("Model freshness: Fresh (90% confidence)")).toBeInTheDocument();
  });

  it("uses 'item' for one and 'items' for several", async () => {
    vi.mocked(analyzeImage).mockResolvedValueOnce(result({ total_count: 1 }));
    renderPage();
    await selectShelfAndUpload();
    await analyze();
    expect(await screen.findByText("item detected")).toBeInTheDocument();
  });

  it("shows the total for a multi-item scan", async () => {
    vi.mocked(analyzeImage).mockResolvedValue(result({ total_count: 4 }));
    renderPage();

    await selectShelfAndUpload();
    await analyze();

    expect(await screen.findByText("items detected")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows UNKNOWN freshness from the backend as is", async () => {
    const unknown = result();
    unknown.detections[0] = { ...unknown.detections[0], freshness: "UNKNOWN", freshness_confidence_percent: 0 };
    vi.mocked(analyzeImage).mockResolvedValue(unknown);
    renderPage();

    await selectShelfAndUpload();
    await analyze();

    expect(await screen.findByText("Model freshness: UNKNOWN")).toBeInTheDocument();
  });
});

describe("manual freshness correction (FR-FRESH-003)", () => {
  it("saves the corrected state and recalculates the product counts", async () => {
    vi.mocked(analyzeImage).mockResolvedValue(result());
    vi.mocked(updateDetectionFreshness).mockResolvedValue({ id: "detection-1", freshness: "Spoiled" });
    renderPage();
    await selectShelfAndUpload();
    await analyze();

    fireEvent.change(await screen.findByLabelText("Correct state"), { target: { value: "Spoiled" } });

    await waitFor(() =>
      expect(updateDetectionFreshness).toHaveBeenCalledWith("detection-1", "Spoiled", "test-token"),
    );
    await waitFor(() => expect(screen.getByLabelText("Correct state")).toHaveValue("Spoiled"));
    const apple = screen.getByRole("heading", { name: "apple" }).parentElement!;
    expect(within(apple).getByText("Rotten").nextElementSibling).toHaveTextContent("1");
    expect(within(apple).getByText("Fresh").nextElementSibling).toHaveTextContent("0");
  });

  it("offers exactly Fresh, Medium and Spoiled", async () => {
    vi.mocked(analyzeImage).mockResolvedValue(result());
    renderPage();
    await selectShelfAndUpload();
    await analyze();

    const options = within(await screen.findByLabelText("Correct state")).getAllByRole("option");

    expect(options.map((option) => option.textContent)).toEqual(["Fresh", "Medium", "Spoiled"]);
  });

  it("shows the error and keeps the original state when the correction fails", async () => {
    vi.mocked(analyzeImage).mockResolvedValue(result());
    vi.mocked(updateDetectionFreshness).mockRejectedValue(new Error("You do not belong to this business."));
    renderPage();
    await selectShelfAndUpload();
    await analyze();

    fireEvent.change(await screen.findByLabelText("Correct state"), { target: { value: "Medium" } });

    expect(await screen.findByText("You do not belong to this business.")).toBeInTheDocument();
    expect(screen.getByLabelText("Correct state")).toHaveValue("Fresh");
  });

  it("cannot correct an item that was not saved (no detection id)", async () => {
    const unsaved = result();
    unsaved.detections[0] = { ...unsaved.detections[0], id: undefined };
    vi.mocked(analyzeImage).mockResolvedValue(unsaved);
    renderPage();
    await selectShelfAndUpload();
    await analyze();

    expect(await screen.findByLabelText("Correct state")).toBeDisabled();
  });
});

describe("retry after a failed analysis (FR-SCAN-004 A2, NFR-USE-005)", () => {
  // Known defect on dev: the preview is cleared even when analysis fails, so the user must
  // pick the photo again. Fixed as BUG-08 on test/comprehensive-system-testing.
  // `it.fails` is Vitest's equivalent of Jest's `it.failing`: remove it once the fix is merged.
  it.fails("keeps the preview so Analyze can be retried without choosing the photo again", async () => {
    vi.mocked(analyzeImage)
      .mockRejectedValueOnce(new Error("AI analysis is temporarily unavailable."))
      .mockResolvedValueOnce(result());
    renderPage();
    await selectShelfAndUpload();

    await analyze();
    expect(await screen.findByText("AI analysis is temporarily unavailable.")).toBeInTheDocument();

    await analyze();
    expect(await screen.findByText("Scan Result")).toBeInTheDocument();
    expect(analyzeImage).toHaveBeenCalledTimes(2);
  });
});

describe("scan history", () => {
  function scan(overrides: Partial<ScanHistoryItem> = {}): ScanHistoryItem {
    return {
      id: "scan-1",
      shelf_id: "shelf-1",
      shelf_name: "Fruit shelf",
      status: "COMPLETED",
      created_at: "2026-09-01T10:00:00Z",
      completed_at: "2026-09-01T10:00:05Z",
      item_count: 3,
      fresh_count: 1,
      medium_count: 1,
      spoiled_count: 1,
      scan_mode: "STOCK_IN",
      items: [
        { type: "apple", freshness: "Fresh" },
        { type: "apple", freshness: "Medium" },
        { type: "orange", freshness: "Spoiled" },
      ],
      ...overrides,
    };
  }

  it("lists scans newest first with mode and freshness counts", async () => {
    vi.mocked(getScanHistory).mockResolvedValue([
      scan({ id: "old", shelf_name: "Old shelf", created_at: "2026-08-01T10:00:00Z" }),
      scan({ id: "new", shelf_name: "New shelf", created_at: "2026-09-10T10:00:00Z", scan_mode: "STOCK_OUT", item_count: 1 }),
    ]);
    renderPage();

    const names = await screen.findAllByText(/^(Old|New) shelf$/);

    expect(names.map((node) => node.textContent)).toEqual(["New shelf", "Old shelf"]);
    expect(screen.getByText("Stock Out · 1 item · Fresh 1 · Medium 1 · Spoiled 1")).toBeInTheDocument();
    expect(screen.getByText("Stock In · 3 items · Fresh 1 · Medium 1 · Spoiled 1")).toBeInTheDocument();
  });

  it("loads the history for the current business", async () => {
    renderPage();

    await waitFor(() => expect(getScanHistory).toHaveBeenCalled());
    const [businessId, token] = vi.mocked(getScanHistory).mock.calls[0];
    expect([businessId, token]).toEqual(["biz-1", "test-token"]);
  });

  it("opens the scan details with a count per product and each item's freshness", async () => {
    vi.mocked(getScanHistory).mockResolvedValue([scan()]);
    renderPage();

    fireEvent.click(await screen.findByText("Fruit shelf"));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Scan details")).toBeInTheDocument();
    expect(within(dialog).getByText("apple: 2")).toBeInTheDocument();
    expect(within(dialog).getByText("orange: 1")).toBeInTheDocument();
    const orangeRow = within(dialog).getByText("orange").parentElement!;
    expect(within(orangeRow).getByText("Spoiled")).toBeInTheDocument();
    const appleRows = within(dialog).getAllByText("apple").map((node) => node.parentElement!);
    expect(appleRows.map((row) => row.lastElementChild?.textContent)).toEqual(["Fresh", "Medium"]);
  });

  it("shows an empty state when there are no scans", async () => {
    renderPage();

    expect(await screen.findByText("No scans found.")).toBeInTheDocument();
  });

  it("shows a clear message when the history cannot be loaded", async () => {
    vi.mocked(getScanHistory).mockRejectedValue(new Error("network"));
    renderPage();

    expect(
      await screen.findByText(
        "Unable to load scan history. Please check that the server is running and try again.",
      ),
    ).toBeInTheDocument();
  });
});

describe("shelf availability", () => {
  it("explains that a shelf is needed when the business has none", async () => {
    vi.mocked(getShelves).mockResolvedValue([]);
    renderPage();

    expect(
      await screen.findByText("No shelves found. Create a shelf before starting a scan."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Select a Shelf")).toBeDisabled();
  });

  it("shows the reason when shelves cannot be loaded", async () => {
    vi.mocked(getShelves).mockRejectedValue(new Error("Failed to load shelves."));
    renderPage();

    expect(await screen.findByText("Failed to load shelves.")).toBeInTheDocument();
  });
});
