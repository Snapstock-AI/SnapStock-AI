import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type CameraScannerProps = {
  onCapture: (file: File) => void;
  onClose: () => void;
};

export default function CameraScanner({
  onCapture,
  onClose,
}: CameraScannerProps) {

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  async function startCamera() {
    try {

      setLoading(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

    } catch (err) {

      console.error(err);

      alert("Cannot access camera.");

      onClose();

    } finally {

      setLoading(false);

    }
  }

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
        className="aspect-video w-full rounded-xl border border-border object-cover"
      />

      <canvas
        ref={canvasRef}
        className="hidden"
      />

      <div className="flex justify-center gap-4">

        <Button
          type="button"
          onClick={captureImage}
          disabled={loading}
          size="lg"
        >
          Capture
        </Button>

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
