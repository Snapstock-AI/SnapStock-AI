import crypto from "crypto";
import { AppDataSource } from "../../config/data-source";
import { EmployeeInvitation } from "../../entities/EmployeeInvitation";
import { User } from "../../entities/User";
import { BusinessUser } from "../../entities/BusinessUser";
import { BusinessService } from "./business.service";
import { AuthRepository } from "../auth/auth.repository";
import { sendEmployeeInvitationEmail } from "../../shared/utils/email";
import bcrypt from "bcrypt";

const INVITATION_VALIDITY_DAYS = 7;

export class InvitationService {
  /**
   * Called when an invited employee opens the invitation link from their email.
   * The token is only delivered to the employee's inbox, so possessing it is
   * enough to link the pre-created account to the business — no sign-in needed.
   */
  static async accept(token: string) {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      throw new Error("Invitation token is required.");
    }

    return AppDataSource.transaction(async (manager) => {
      const invitation = await manager.findOne(EmployeeInvitation, {
        where: { invitation_token: normalizedToken },
      });

      if (!invitation) {
        throw new Error(
          "Invitation not found. Ask the owner to send a new invitation.",
        );
      }

      const user = await manager.findOne(User, {
        where: { email: invitation.email.toLowerCase() },
      });

      if (!user) {
        throw new Error(
          "The account for this invitation no longer exists. Ask the owner to send a new invitation.",
        );
      }

      const existingMembership = await manager.findOne(BusinessUser, {
        where: { user_id: user.id, business_id: invitation.business_id },
      });

      if (invitation.status === "ACCEPTED" && existingMembership) {
        return { businessId: invitation.business_id, email: user.email };
      }

      if (invitation.status !== "PENDING") {
        throw new Error("This invitation is invalid or has already been used.");
      }

      if (invitation.expires_at <= new Date()) {
        invitation.status = "EXPIRED";
        await manager.save(invitation);
        throw new Error(
          "This invitation has expired. Ask the owner to send a new invitation.",
        );
      }

      const membershipInAnotherBusiness = await manager.findOne(BusinessUser, {
        where: { user_id: user.id },
      });

      if (membershipInAnotherBusiness) {
        throw new Error("This user already belongs to a business.");
      }

      await manager.save(
        manager.create(BusinessUser, {
          business_id: invitation.business_id,
          user_id: user.id,
          role: "EMPLOYEE",
          joined_at: new Date(),
        }),
      );

      invitation.status = "ACCEPTED";
      invitation.accepted_at = new Date();
      await manager.save(invitation);

      return { businessId: invitation.business_id, email: user.email };
    });
  }

  /** True when this email has an invitation the employee has not accepted yet. */
  static async hasPendingInvitation(email: string) {
    return AppDataSource.getRepository(EmployeeInvitation).exists({
      where: { email: email.trim().toLowerCase(), status: "PENDING" },
    });
  }

  /** True when this email was ever invited as an employee (i.e. not a self-registered owner). */
  static async wasInvited(email: string) {
    return AppDataSource.getRepository(EmployeeInvitation).exists({
      where: { email: email.trim().toLowerCase() },
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

 
  static async send(
    invitedBy: string,
    businessId: string,
    details: {
      email: string;
      full_name: string;
      nic?: string;
      date_of_birth?: string;
    },
  ) {
    const membership = await BusinessService.getMembership(
      invitedBy,
      businessId,
    );

    if (!membership || membership.role !== "OWNER") {
      throw new Error("Only the business owner can invite employees.");
    }

    const normalizedEmail = details.email.trim().toLowerCase();
    const recipient =
      await AuthRepository.findByEmailIncludingDeleted(normalizedEmail);

    if (recipient) {
      if (recipient.deleted_at) {
        throw new Error(
          "This email belongs to a removed account and cannot be reused.",
        );
      }
      throw new Error("An account already exists for this email address.");
    }

    const invRepo = AppDataSource.getRepository(EmployeeInvitation);
    const existingInvitation = await invRepo.findOne({
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
      await invRepo.save(existingInvitation);
    }

    const invitationToken = crypto.randomBytes(32).toString("hex");
    const temporaryPassword = crypto.randomBytes(9).toString("base64url");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_VALIDITY_DAYS);

    let createdUserId: string | null = null;
    let createdInvitationId: string | null = null;

    const invitation = await AppDataSource.transaction(async (manager) => {
      const user = await manager.save(
        manager.create(User, {
          full_name: details.full_name.trim(),
          email: normalizedEmail,
          nic: details.nic?.trim() || null,
          date_of_birth: details.date_of_birth || null,
          password_hash: await bcrypt.hash(temporaryPassword, 10),
          email_verified: true,
          must_change_password: true,
        }),
      );
      createdUserId = user.id;

      return manager.save(
        manager.create(EmployeeInvitation, {
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
    });

    createdInvitationId = invitation.id;

    try {
      await sendEmployeeInvitationEmail(
        normalizedEmail,
        invitationToken,
        membership.business_name,
        temporaryPassword,
      );
    } catch (emailError) {
      if (createdInvitationId) {
        await invRepo.delete({ id: createdInvitationId });
      }
      if (createdUserId) {
        await AppDataSource.getRepository(User).delete({ id: createdUserId });
      }
      throw emailError;
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
