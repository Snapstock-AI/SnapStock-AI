import { Router } from "express";
import multer from "multer";
import { DetectionController } from "./detection.controller";
import { authMiddleware } from "../../shared/middleware/auth.middleware";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post(
  "/upload-url",
  authMiddleware,
  DetectionController.createUploadUrl
);

router.get(
  "/status/:scanId",
  authMiddleware,
  DetectionController.getScanStatus
);

router.post(
  "/queue",
  authMiddleware,
  DetectionController.queueUploadedScan
);

router.post(
  "/analyze",
  authMiddleware,
  upload.single("file"),
  DetectionController.analyze
);

export default router;
