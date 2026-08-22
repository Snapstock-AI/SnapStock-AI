import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom";

import ScansPage from "../../src/pages/dashboard/ScansPage";
import { analyzeImage } from "../../src/lib/detection";


vi.mock("../../src/lib/detection", () => ({
  analyzeImage: vi.fn(),
}));


vi.mock("../../src/context/AuthContext", () => ({
  useAuth: () => ({
    token: "test-token",
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
            })
          )
        }
      >
        Capture Test Image
      </button>
    </div>
  ),
}));


const shelfId =
  "550e8400-e29b-41d4-a716-446655440001";

const businessId =
  "550e8400-e29b-41d4-a716-446655440000";

const mockShelf = {
  id: shelfId,
  name: "Shelf A - Bananas",
  category: "Fruit",
};

const mockResult = {
  scanId: "scan-123",

  image_width: 640,
  image_height: 480,

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

      class_name: "Apple",

      confidence: 0.95,

      bounding_box: {
        x1: 10,
        y1: 20,
        x2: 100,
        y2: 200,
      },

      freshness: "Fresh",

      freshness_confidence: 0.9,

      freshness_confidence_percent: 90,
    },
  ],

  shelf: mockShelf,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ScansPage", () => {


  it("should render the shelf scanning page", () => {
    render(<ScansPage />);

    expect(
      screen.getByRole("heading", {
        name: "Shelf scans",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("combobox")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /open camera/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText("Upload Photo")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Scan History")
    ).toBeInTheDocument();
  });



  it("should display available shelves", () => {
    render(<ScansPage />);

    expect(
      screen.getByRole("option", {
        name: /Shelf A - Bananas/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("option", {
        name: /Shelf B - Tomatoes/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("option", {
        name: /Shelf C - Apples/i,
      })
    ).toBeInTheDocument();
  });

  it("should allow the user to select a shelf", () => {
    render(<ScansPage />);

    const select = screen.getByRole("combobox");

    fireEvent.change(select, {
      target: {
        value: shelfId,
      },
    });

    expect(select).toHaveValue(shelfId);
  });



  it("should show an error when opening the camera without selecting a shelf", () => {
    render(<ScansPage />);

    const cameraButton = screen.getByRole("button", {
      name: /open camera/i,
    });

    fireEvent.click(cameraButton);

    expect(
      screen.getByText("Please select a shelf first.")
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Capture Test Image")
    ).not.toBeInTheDocument();
  });

  it("should open the camera after selecting a shelf", () => {
    render(<ScansPage />);

    const select = screen.getByRole("combobox");

    fireEvent.change(select, {
      target: {
        value: shelfId,
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /open camera/i,
      })
    );

    expect(
      screen.getByText("Capture Test Image")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Close Camera")
    ).toBeInTheDocument();
  });

  it("should close the camera when close is clicked", () => {
    render(<ScansPage />);

    const select = screen.getByRole("combobox");

    fireEvent.change(select, {
      target: {
        value: shelfId,
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /open camera/i,
      })
    );

    expect(
      screen.getByText("Capture Test Image")
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Close Camera",
      })
    );

    expect(
      screen.queryByText("Capture Test Image")
    ).not.toBeInTheDocument();
  });

 

  it("should show the preview after capturing an image", () => {
    render(<ScansPage />);

    const select = screen.getByRole("combobox");

    fireEvent.change(select, {
      target: {
        value: shelfId,
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /open camera/i,
      })
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Capture Test Image",
      })
    );

    expect(
      screen.getByRole("heading", {
        name: "Preview",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Retake",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Analyze",
      })
    ).toBeInTheDocument();
  });

  it("should reopen the camera when retake is clicked", () => {
    render(<ScansPage />);

    const select = screen.getByRole("combobox");

    fireEvent.change(select, {
      target: {
        value: shelfId,
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /open camera/i,
      })
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Capture Test Image",
      })
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Retake",
      })
    );

    expect(
      screen.getByText("Capture Test Image")
    ).toBeInTheDocument();
  });



  it("should show the preview after uploading an image", async () => {
    render(<ScansPage />);

    const select = screen.getByRole("combobox");

    fireEvent.change(select, {
      target: {
        value: shelfId,
      },
    });

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    const file = new File(
      ["test-image"],
      "shelf.jpg",
      {
        type: "image/jpeg",
      }
    );

    fireEvent.change(input, {
      target: {
        files: [file],
      },
    });

    expect(
      await screen.findByRole("heading", {
        name: "Preview",
      })
    ).toBeInTheDocument();
  });

 

  it("should analyze the selected image", async () => {
    vi.mocked(analyzeImage).mockResolvedValue(
      mockResult
    );

    render(<ScansPage />);

    const select = screen.getByRole("combobox");

    fireEvent.change(select, {
      target: {
        value: shelfId,
      },
    });

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    const file = new File(
      ["test-image"],
      "shelf.jpg",
      {
        type: "image/jpeg",
      }
    );

    fireEvent.change(input, {
      target: {
        files: [file],
      },
    });

    expect(
      await screen.findByRole("heading", {
        name: "Preview",
      })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Analyze",
      })
    );

    await waitFor(() => {
      expect(analyzeImage).toHaveBeenCalledTimes(1);
    });

    expect(analyzeImage).toHaveBeenCalledWith(
      file,
      mockShelf,
      businessId,
      "test-token"
    );
  });

  it("should display the scan result after successful analysis", async () => {
    vi.mocked(analyzeImage).mockResolvedValue(
      mockResult
    );

    render(<ScansPage />);

    const select = screen.getByRole("combobox");

    fireEvent.change(select, {
      target: {
        value: shelfId,
      },
    });

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    const file = new File(
      ["test-image"],
      "shelf.jpg",
      {
        type: "image/jpeg",
      }
    );

    fireEvent.change(input, {
      target: {
        files: [file],
      },
    });

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Analyze",
      })
    );

    expect(
      await screen.findByText("Scan Result")
    ).toBeInTheDocument();

    expect(
      screen.getByText("2")
    ).toBeInTheDocument();

    expect(
      screen.getByText("apple")
    ).toBeInTheDocument();

    expect(
      screen.getByText("lemon")
    ).toBeInTheDocument();

    expect(
      screen.getAllByText("Total")
    ).toHaveLength(2);

    expect(
      screen.getAllByText("Fresh")
    ).toHaveLength(2);

    expect(
      screen.getAllByText("Rotten")
    ).toHaveLength(2);
  });


  it("should display an error when image analysis fails", async () => {
    vi.mocked(analyzeImage).mockRejectedValue(
      new Error("AI service unavailable")
    );

    render(<ScansPage />);

    const select = screen.getByRole("combobox");

    fireEvent.change(select, {
      target: {
        value: shelfId,
      },
    });

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    const file = new File(
      ["test-image"],
      "shelf.jpg",
      {
        type: "image/jpeg",
      }
    );

    fireEvent.change(input, {
      target: {
        files: [file],
      },
    });

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Analyze",
      })
    );

    expect(
      await screen.findByText(
        "AI service unavailable"
      )
    ).toBeInTheDocument();
  });
});