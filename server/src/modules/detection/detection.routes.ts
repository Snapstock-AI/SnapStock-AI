import { Router } from "express";
import { DetectionController } from "./detection.controller";
import { authMiddleware } from "../../shared/middleware/auth.middleware";

const router = Router();

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

export default router;
