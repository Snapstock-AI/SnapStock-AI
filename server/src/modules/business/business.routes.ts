import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth.middleware";
import { BusinessController } from "./business.controller";
import { InvitationController } from "./invitation.controller";

const router = Router();

router.use(authMiddleware);
router.get("/mine", BusinessController.listMine);
router.post("/", BusinessController.create);
router.post("/invitations/accept", InvitationController.accept);
router.patch("/:businessId", BusinessController.update);
router.delete("/:businessId", BusinessController.remove);
router.get("/:businessId/employees", BusinessController.listEmployees);
router.delete(
  "/:businessId/employees/:userId",
  BusinessController.removeEmployee,
);
router.get("/:businessId/invitations", InvitationController.list);
router.post("/:businessId/invitations", InvitationController.send);

export default router;
