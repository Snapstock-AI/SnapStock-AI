import { NextFunction, Request, Response, Router } from "express";
import multer from "multer";
import { DetectionController } from "./detection.controller";
import { authMiddleware } from "../../shared/middleware/auth.middleware";

const router = Router();

// NFR-SEC-004.3 / NFR-SEC-006: validate type and size on the server, not only in the client.
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE"));
    }
  },
});

function hasImageSignature(buffer: Buffer) {
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.subarray(0, 8).equals(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  const isWebp =
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP";
  return isJpeg || isPng || isWebp;
}

// FR-SCAN-004 A1: invalid uploads are answered with 400 before any scan is created.
function receiveImage(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (error?: unknown) => {
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? `Image is too large. The maximum size is ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`
          : "Unsupported file. Please upload a JPEG, PNG or WebP image.";
      return res.status(400).json({ success: false, message });
    }
    if (error) return next(error);

    if (req.file && !hasImageSignature(req.file.buffer)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported file. Please upload a JPEG, PNG or WebP image.",
      });
    }
    next();
  });
}

router.post("/analyze", authMiddleware, receiveImage, DetectionController.analyze);
router.get("/history", authMiddleware, DetectionController.history);
router.patch(
  "/:detectionId/freshness",
  authMiddleware,
  DetectionController.correctFreshness,
);

export default router;
