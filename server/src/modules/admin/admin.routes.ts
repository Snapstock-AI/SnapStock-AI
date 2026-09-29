import { Router } from "express";
import { authMiddleware, requireRoles } from "../../shared/middleware/auth.middleware";
import { AdminController } from "./admin.controller";

const router = Router();

router.use(authMiddleware, requireRoles("SYSTEM_ADMIN"));

router.get("/vendors", AdminController.listVendors);
router.patch("/vendors/:businessId/suspend", AdminController.suspendVendor);
router.patch("/vendors/:businessId/activate", AdminController.activateVendor);
router.get("/stats", AdminController.stats);

export default router;
