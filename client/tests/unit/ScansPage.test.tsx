import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router";

import ScansPage from "../../src/pages/dashboard/ScansPage";
import { analyzeImage, getScanHistory } from "../../src/lib/detection";
import { getShelves } from "../../src/lib/shelf";

vi.mock("../../src/lib/detection", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/lib/detection")>();
  return {
    ...actual,
    analyzeImage: vi.fn(),
    getScanHistory: vi.fn(),
    updateDetectionFreshness: vi.fn(),
  };
});

vi.mock("../../src/lib/shelf", () => ({
  getShelves: vi.fn(),
}));

vi.mock("../../src/context/AuthContext", () => ({
  useAuth: () => ({
    token: "test-token",
    user: {
      businessId: "550e8400-e29b-41d4-a716-446655440000",
    },
  }),
}));

vi.mock("../../src/components/scanner/CameraScanner", () => ({
  default: ({
    onClose,
    onCapture,
  }: {
    onClose: () => void;
    onCapture: (file: File) => void;
  }) => (
    <div>
      <button onClick={onClose}>Close Camera</button>
      <button
        onClick={() =>
          onCapture(
            new File(["camera-image"], "camera.jpg", {
              type: "image/jpeg",
            }),
          )
        }
      >
        Capture Test Image
      </button>
    </div>
  ),
}));

const shelfId = "550e8400-e29b-41d4-a716-446655440001";
const businessId = "550e8400-e29b-41d4-a716-446655440000";

const mockShelves = [
  { id: shelfId, name: "Shelf A - Bananas", category: "Fruit" },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Shelf B - Tomatoes",
    category: "Vegetable",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    name: "Shelf C - Apples",
    category: "Fruit",
  },
];

const mockShelf = mockShelves[0];

function renderPage() {
  return render(
    <MemoryRouter>
      <ScansPage />
    </MemoryRouter>,
  );
}

const mockResult = {
  scanId: "scan-123",
  image_width: 640,
  image_height: 480,
  total_count: 2,
  counts: {
    apple: { fresh: 1, rotten: 0, total: 1 },
    lemon: { fresh: 1, rotten: 0, total: 1 },
  },
  detections: [
    {
      id: "detection-1",
      class_name: "Apple",
      confidence: 0.95,
      bounding_box: { x1: 10, y1: 20, x2: 100, y2: 200 },
      freshness: "Fresh",
      freshness_confidence: 0.9,
      freshness_confidence_percent: 90,
    },
  ],
  inventoryChanges: [],
  shelf: mockShelf,
};

async function selectShelfAndUpload(file = new File(["test-image"], "shelf.jpg", { type: "image/jpeg" })) {
  const select = await screen.findByRole("combobox");
  fireEvent.change(select, { target: { value: shelfId } });

  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getShelves).mockResolvedValue(mockShelves);
  vi.mocked(getScanHistory).mockResolvedValue([]);
});

describe("ScansPage", () => {
  it("should render the shelf scanning page", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Shelf scans" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open camera/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Upload Photo")).toBeInTheDocument();
    expect(screen.getByText("Scan History")).toBeInTheDocument();
  });

  it("should display available shelves", async () => {
    renderPage();

    expect(
      await screen.findByRole("option", { name: /Shelf A - Bananas/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Shelf B - Tomatoes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Shelf C - Apples/i }),
    ).toBeInTheDocument();
  });

  it("should allow the user to select a shelf", async () => {
    renderPage();
    const select = await screen.findByRole("combobox");
    fireEvent.change(select, { target: { value: shelfId } });
    expect(select).toHaveValue(shelfId);
  });

  it("should show an error when opening the camera without selecting a shelf", async () => {
    renderPage();
    await screen.findByRole("combobox");
    fireEvent.click(screen.getByRole("button", { name: /open camera/i }));
    expect(screen.getByText("Please select a shelf first.")).toBeInTheDocument();
    expect(screen.queryByText("Capture Test Image")).not.toBeInTheDocument();
  });

  it("should open the camera after selecting a shelf", async () => {
    renderPage();
    const select = await screen.findByRole("combobox");
    fireEvent.change(select, { target: { value: shelfId } });
    fireEvent.click(screen.getByRole("button", { name: /open camera/i }));
    expect(screen.getByText("Capture Test Image")).toBeInTheDocument();
    expect(screen.getByText("Close Camera")).toBeInTheDocument();
  });

  it("should close the camera when close is clicked", async () => {
    renderPage();
    const select = await screen.findByRole("combobox");
    fireEvent.change(select, { target: { value: shelfId } });
    fireEvent.click(screen.getByRole("button", { name: /open camera/i }));
    fireEvent.click(screen.getByRole("button", { name: "Close Camera" }));
    expect(screen.queryByText("Capture Test Image")).not.toBeInTheDocument();
  });

  it("should show the preview after capturing an image", async () => {
    renderPage();
    const select = await screen.findByRole("combobox");
    fireEvent.change(select, { target: { value: shelfId } });
    fireEvent.click(screen.getByRole("button", { name: /open camera/i }));
    fireEvent.click(screen.getByRole("button", { name: "Capture Test Image" }));
    expect(screen.getByRole("heading", { name: "Preview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retake" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze" })).toBeInTheDocument();
  });

  it("should reopen the camera when retake is clicked", async () => {
    renderPage();
    const select = await screen.findByRole("combobox");
    fireEvent.change(select, { target: { value: shelfId } });
    fireEvent.click(screen.getByRole("button", { name: /open camera/i }));
    fireEvent.click(screen.getByRole("button", { name: "Capture Test Image" }));
    fireEvent.click(screen.getByRole("button", { name: "Retake" }));
    expect(screen.getByText("Capture Test Image")).toBeInTheDocument();
  });

  it("should show the preview after uploading an image", async () => {
    renderPage();
    await selectShelfAndUpload();
    expect(
      await screen.findByRole("heading", { name: "Preview" }),
    ).toBeInTheDocument();
  });

  it("should analyze the selected image", async () => {
    vi.mocked(analyzeImage).mockResolvedValue(mockResult);
    renderPage();
    const file = await selectShelfAndUpload();
    expect(
      await screen.findByRole("heading", { name: "Preview" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
    await waitFor(() => {
      expect(analyzeImage).toHaveBeenCalledTimes(1);
    });
    expect(analyzeImage).toHaveBeenCalledWith(
      file,
      mockShelf,
      businessId,
      "test-token",
      "STOCK_IN",
    );
  });

  it("should display the scan result after successful analysis", async () => {
    vi.mocked(analyzeImage).mockResolvedValue(mockResult);
    renderPage();
    await selectShelfAndUpload();
    fireEvent.click(await screen.findByRole("button", { name: "Analyze" }));
    expect(await screen.findByText("Scan Result")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("apple")).toBeInTheDocument();
    expect(screen.getByText("lemon")).toBeInTheDocument();
    expect(screen.getAllByText("Total").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Fresh").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Rotten").length).toBeGreaterThanOrEqual(2);
  });

  it("should display an error when image analysis fails", async () => {
    vi.mocked(analyzeImage).mockRejectedValue(
      new Error("AI service unavailable"),
    );
    renderPage();
    await selectShelfAndUpload();
    fireEvent.click(await screen.findByRole("button", { name: "Analyze" }));
    expect(await screen.findByText("AI service unavailable")).toBeInTheDocument();
  });
});
