import crypto from "crypto";
import { AppDataSource } from "../../config/data-source";
import { EmployeeInvitation } from "../../entities/EmployeeInvitation";
import { User } from "../../entities/User";
import { BusinessUser } from "../../entities/BusinessUser";
import { BusinessService } from "./business.service";
import { sendEmployeeInvitationEmail } from "../../shared/utils/email";

const INVITATION_VALIDITY_DAYS = 7;

export class InvitationService {
  static async accept(userId: string, token: string) {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      throw new Error("Invitation token is required.");
    }

    return AppDataSource.transaction(async (manager) => {
      const invitation = await manager.findOne(EmployeeInvitation, {
        where: { invitation_token: normalizedToken },
      });

      const user = await manager.findOne(User, { where: { id: userId } });
      if (!invitation) {
        throw new Error(
          "Invitation not found. Ask the owner to send a new invitation.",
        );
      }

      if (
        !user ||
        user.email.toLowerCase() !== invitation.email.toLowerCase()
      ) {
        throw new Error(
          "Sign in with the email address that received this invitation.",
        );
      }

      const existingMembership = await manager.findOne(BusinessUser, {
        where: { user_id: userId, business_id: invitation.business_id },
      });

      if (invitation.status === "ACCEPTED" && existingMembership) {
        return { businessId: invitation.business_id };
      }

      if (invitation.status !== "PENDING") {
        throw new Error("This invitation is invalid or has already been used.");
      }

      if (invitation.expires_at <= new Date()) {
        invitation.status = "EXPIRED";
        await manager.save(invitation);
        throw new Error("This invitation has expired.");
      }

      const membershipInAnotherBusiness = await manager.findOne(BusinessUser, {
        where: { user_id: userId },
      });

      if (membershipInAnotherBusiness) {
        throw new Error("This user already belongs to a business.");
      }

      await manager.save(
        manager.create(BusinessUser, {
          business_id: invitation.business_id,
          user_id: userId,
          role: "EMPLOYEE",
        }),
      );

      invitation.status = "ACCEPTED";
      invitation.accepted_at = new Date();
      await manager.save(invitation);

      return { businessId: invitation.business_id };
    });
  }

  static async list(invitedBy: string, businessId: string) {
    const membership = await BusinessService.getMembership(
      invitedBy,
      businessId,
    );

    if (!membership || membership.role !== "OWNER") {
      throw new Error("Only the business owner can view invitations.");
    }

    const invitations = await AppDataSource.getRepository(
      EmployeeInvitation,
    ).find({
      where: { business_id: businessId },
      order: { created_at: "DESC" },
    });

    return invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expires_at: invitation.expires_at,
      created_at: invitation.created_at,
      accepted_at: invitation.accepted_at,
    }));
  }

  static async send(invitedBy: string, businessId: string, email: string) {
    const membership = await BusinessService.getMembership(
      invitedBy,
      businessId,
    );

    if (!membership || membership.role !== "OWNER") {
      throw new Error("Only the business owner can invite employees.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const recipient = await AppDataSource.getRepository(User).findOne({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (
      recipient &&
      (await BusinessService.findBusinessIdByUserId(recipient.id))
    ) {
      throw new Error("This user already belongs to a business.");
    }

    const repository = AppDataSource.getRepository(EmployeeInvitation);
    const existingInvitation = await repository.findOne({
      where: {
        business_id: businessId,
        email: normalizedEmail,
        status: "PENDING",
      },
    });

    if (existingInvitation && existingInvitation.expires_at > new Date()) {
      throw new Error("A pending invitation already exists for this email.");
    }

    if (existingInvitation) {
      existingInvitation.status = "EXPIRED";
      await repository.save(existingInvitation);
    }

    const invitationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_VALIDITY_DAYS);

    const invitation = await repository.save(
      repository.create({
        business_id: businessId,
        invited_by: invitedBy,
        email: normalizedEmail,
        role: "EMPLOYEE",
        invitation_token: invitationToken,
        status: "PENDING",
        expires_at: expiresAt,
        accepted_at: null,
      }),
    );

    try {
      await sendEmployeeInvitationEmail(
        normalizedEmail,
        invitationToken,
        membership.business_name,
      );
    } catch (error) {
      await repository.delete({ id: invitation.id });
      throw error;
    }

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expires_at: invitation.expires_at,
    };
  }
}
