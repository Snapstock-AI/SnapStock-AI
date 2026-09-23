import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth.middleware";
import { ShelfController } from "./shelf.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", ShelfController.list);
router.post("/", ShelfController.create);
router.put("/:id", ShelfController.update);
router.delete("/:id", ShelfController.remove);

export default router;
