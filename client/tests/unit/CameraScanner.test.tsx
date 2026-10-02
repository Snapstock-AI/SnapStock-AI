import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import CameraScanner from "../../src/components/scanner/CameraScanner";

const fakeStream = () =>
  ({ getTracks: () => [{ stop: vi.fn() }] }) as unknown as MediaStream;

function mockCameras(count: number) {
  const getUserMedia = vi.fn().mockImplementation(() => Promise.resolve(fakeStream()));
  const enumerateDevices = vi.fn().mockResolvedValue(
    Array.from({ length: count }, (_, i) => ({ kind: "videoinput", deviceId: `cam-${i}` })),
  );
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia, enumerateDevices },
  });
  return getUserMedia;
}

beforeEach(() => {
  localStorage.clear();
  // jsdom does not implement media playback.
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

describe("CameraScanner camera selection", () => {
  it("opens the rear camera by default", async () => {
    const getUserMedia = mockCameras(2);

    render(<CameraScanner onCapture={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    expect(getUserMedia).toHaveBeenLastCalledWith({
      video: { facingMode: { ideal: "environment" } },
    });
  });

  it("switches between rear and front camera and remembers the choice", async () => {
    const getUserMedia = mockCameras(2);

    const { unmount } = render(<CameraScanner onCapture={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Switch to front camera" }));

    await waitFor(() =>
      expect(getUserMedia).toHaveBeenLastCalledWith({
        video: { facingMode: { ideal: "user" } },
      }),
    );
    expect(await screen.findByRole("button", { name: "Switch to rear camera" })).toBeInTheDocument();
    expect(localStorage.getItem("snapstock.cameraFacing")).toBe("user");

    unmount();
    getUserMedia.mockClear();
    render(<CameraScanner onCapture={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() =>
      expect(getUserMedia).toHaveBeenLastCalledWith({
        video: { facingMode: { ideal: "user" } },
      }),
    );
  });

  it("hides the toggle on devices with a single camera", async () => {
    const getUserMedia = mockCameras(1);

    render(<CameraScanner onCapture={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: "Capture" })).toBeEnabled());
    expect(screen.queryByRole("button", { name: /switch to/i })).not.toBeInTheDocument();
  });
});
