import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth.middleware";
import { BusinessController } from "./business.controller";

const router = Router();

router.use(authMiddleware);
router.get("/mine", BusinessController.listMine);
router.post("/", BusinessController.create);

export default router;
