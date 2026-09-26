import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth.middleware";
import { BusinessController } from "./business.controller";
import { InvitationController } from "./invitation.controller";
import { DashboardController } from "../dashboard/dashboard.controller";

const router = Router();

// Public: the emailed invitation token itself authorizes the employee
router.post("/invitations/accept", InvitationController.accept);

router.use(authMiddleware);
router.get("/mine", BusinessController.listMine);
router.post("/", BusinessController.create);
router.patch("/:businessId", BusinessController.update);
router.delete("/:businessId", BusinessController.remove);
router.get("/:businessId/employees", BusinessController.listEmployees);
router.delete(
  "/:businessId/employees/:userId",
  BusinessController.removeEmployee,
);
router.get("/:businessId/invitations", InvitationController.list);
router.post("/:businessId/invitations", InvitationController.send);

router.get("/:businessId/dashboard", DashboardController.dashboard);
router.get("/:businessId/analytics", DashboardController.analytics);
router.get("/:businessId/inventory", DashboardController.inventory);
router.get("/:businessId/alerts", DashboardController.alerts);

export default router;
