import { Router } from "express";
import multer from "multer";
import { DetectionController } from "./detection.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post(
  "/analyze",
  upload.single("file"),
  DetectionController.analyze
);

export default router;