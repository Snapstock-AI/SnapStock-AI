import { Router } from "express";
import multer from "multer";
import { DetectionController } from "./detection.controller";
import { authMiddleware } from "../../shared/middleware/auth.middleware";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post(
  "/analyze",
  authMiddleware,
  upload.single("file"),
  DetectionController.analyze,
);
router.get("/history", authMiddleware, DetectionController.history);
router.patch(
  "/:detectionId/freshness",
  authMiddleware,
  DetectionController.correctFreshness,
);

export default router;
