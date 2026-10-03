import { useEffect, useRef, useState } from "react";
import { SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";

type CameraScannerProps = {
  onCapture: (file: File) => void;
  onClose: () => void;
};

/** "environment" = rear camera, "user" = front camera. */
export type CameraFacing = "environment" | "user";

const FACING_STORAGE_KEY = "snapstock.cameraFacing";

// Shelves are photographed with the rear camera on phones; laptops with a single
// webcam ignore the preference and use the camera they have.
function readSavedFacing(): CameraFacing {
  try {
    const saved = localStorage.getItem(FACING_STORAGE_KEY);
    return saved === "user" ? "user" : "environment";
  } catch {
    return "environment";
  }
}

function saveFacing(facing: CameraFacing) {
  try {
    localStorage.setItem(FACING_STORAGE_KEY, facing);
  } catch {
    // Storage can be unavailable (private mode); the toggle still works for this session.
  }
}

export default function CameraScanner({
  onCapture,
  onClose,
}: CameraScannerProps) {

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [loading, setLoading] = useState(false);
  const [facing, setFacing] = useState<CameraFacing>(readSavedFacing);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Read through a ref so a new onClose from the parent does not restart the camera.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // Ignore a stream that resolves after the user already switched cameras or closed.
    let cancelled = false;

    async function startCamera() {
      try {

        setLoading(true);
        stopCamera();

        const stream = await navigator.mediaDevices.getUserMedia({
          // "ideal" falls back to any camera instead of failing on single-camera devices.
          video: { facingMode: { ideal: facing } },
        });

        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Device labels/count are only reliable after permission is granted.
        const devices = await navigator.mediaDevices.enumerateDevices?.() ?? [];
        if (!cancelled) {
          setHasMultipleCameras(
            devices.filter(device => device.kind === "videoinput").length > 1,
          );
        }

      } catch (err) {

        if (cancelled) return;

        console.error(err);

        alert("Cannot access camera.");

        onCloseRef.current();

      } finally {

        if (!cancelled) setLoading(false);

      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [facing]);

  function stopCamera() {

    if (streamRef.current) {

      streamRef.current.getTracks().forEach(track => track.stop());

      streamRef.current = null;

    }

    if (videoRef.current) {

      videoRef.current.pause();

      videoRef.current.srcObject = null;

    }

  }

  function switchCamera() {

    const next: CameraFacing = facing === "environment" ? "user" : "environment";

    saveFacing(next);

    setFacing(next);

  }

  function captureImage() {

    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(blob => {

      if (!blob) return;

      const file = new File(
        [blob],
        "capture.jpg",
        {
          type: "image/jpeg",
        }
      );

      stopCamera();

      onCapture(file);

    }, "image/jpeg");

  }

  function closeCamera() {

    stopCamera();

    onClose();

  }

  return (

    <div className="space-y-5">

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        // Mirror the front camera preview like a selfie view; the captured photo is not mirrored.
        className={`aspect-video w-full rounded-xl border border-border object-cover ${
          facing === "user" ? "-scale-x-100" : ""
        }`}
      />

      <canvas
        ref={canvasRef}
        className="hidden"
      />

      <div className="flex flex-wrap justify-center gap-4">

        <Button
          type="button"
          onClick={captureImage}
          disabled={loading}
          size="lg"
        >
          Capture
        </Button>

        {hasMultipleCameras && (
          <Button
            type="button"
            variant="outline"
            onClick={switchCamera}
            disabled={loading}
            size="lg"
            aria-label={
              facing === "environment"
                ? "Switch to front camera"
                : "Switch to rear camera"
            }
          >
            <SwitchCamera className="h-4 w-4" />
            {facing === "environment" ? "Front camera" : "Rear camera"}
          </Button>
        )}

        <Button
          type="button"
          variant="destructive"
          onClick={closeCamera}
          size="lg"
        >
          Close
        </Button>

      </div>

    </div>

  );

}
