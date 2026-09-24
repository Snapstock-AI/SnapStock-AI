import crypto from "crypto";
import { AppDataSource } from "../../config/data-source";
import { EmployeeInvitation } from "../../entities/EmployeeInvitation";
import { User } from "../../entities/User";
import { BusinessUser } from "../../entities/BusinessUser";
import { EmailVerificationToken } from "../../entities/EmailVerificationToken";
import { BusinessService } from "./business.service";
import { AuthRepository } from "../auth/auth.repository";
import { sendEmployeeInvitationEmail } from "../../shared/utils/email";
import bcrypt from "bcrypt";

const INVITATION_VALIDITY_DAYS = 7;

export class InvitationService {
  /**
   * Called when a logged-in employee visits /accept-invitation?token=...
   * Edge-case path for users already authenticated but not yet linked to business.
   */
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

      if (!user.email_verified) {
        user.email_verified = true;
        await manager.save(user);
      }

      await manager.save(
        manager.create(BusinessUser, {
          business_id: invitation.business_id,
          user_id: userId,
          role: "EMPLOYEE",
          joined_at: new Date(),
        }),
      );

      invitation.status = "ACCEPTED";
      invitation.accepted_at = new Date();
      await manager.save(invitation);

      return { businessId: invitation.business_id };
    });
  }

  /**
   * Activate a PENDING invitation by token after the employee verifies their email.
   * Called from AuthService.verifyEmail() automatically — no separate auth step.
   * Creates the BusinessUser record and marks the invitation ACCEPTED.
   */
  static async activateByToken(userId: string, token: string) {
    const repo = AppDataSource.getRepository(EmployeeInvitation);

    const invitation = await repo.findOne({
      where: { invitation_token: token, status: "PENDING" },
    });

    if (!invitation) {
      // No matching pending invitation — this is a normal email verification
      return null;
    }

    if (invitation.expires_at <= new Date()) {
      await repo.update({ id: invitation.id }, { status: "EXPIRED" });
      throw new Error(
        "This invitation link has expired. Ask your owner to resend the invitation.",
      );
    }

    const existingMembership = await AppDataSource.getRepository(
      BusinessUser,
    ).findOne({ where: { user_id: userId } });

    if (!existingMembership) {
      await AppDataSource.getRepository(BusinessUser).save(
        AppDataSource.getRepository(BusinessUser).create({
          business_id: invitation.business_id,
          user_id: userId,
          role: "EMPLOYEE",
          joined_at: new Date(),
        }),
      );
    }

    await repo.update(
      { id: invitation.id },
      { status: "ACCEPTED", accepted_at: new Date() },
    );

    return { businessId: invitation.business_id };
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

  /**
   * Owner sends an invitation:
   *  1. Creates an unverified User account with a temporary password.
   *  2. Stores the invitation token as the email verification token.
   *  3. Creates a PENDING EmployeeInvitation (no BusinessUser yet).
   *  4. Sends a verification/invitation email with the token link.
   *
   * When the employee clicks the verify link:
   *  → GET /auth/verify-email?token=<token> → AuthService.verifyEmail()
   *  → verifyEmail marks email verified, then calls InvitationService.activateByToken()
   *  → activateByToken creates BusinessUser + marks invitation ACCEPTED.
   */
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

    // The invitation token doubles as the email verification token
    const invitationToken = crypto.randomBytes(32).toString("hex");
    const temporaryPassword = crypto.randomBytes(9).toString("base64url");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_VALIDITY_DAYS);

    let createdUserId: string | null = null;
    let createdInvitationId: string | null = null;

    const invitation = await AppDataSource.transaction(async (manager) => {
      // 1. Create unverified user
      const user = await manager.save(
        manager.create(User, {
          full_name: details.full_name.trim(),
          email: normalizedEmail,
          nic: details.nic?.trim() || null,
          date_of_birth: details.date_of_birth || null,
          password_hash: await bcrypt.hash(temporaryPassword, 10),
          email_verified: false,         // not verified yet
          must_change_password: true,
        }),
      );
      createdUserId = user.id;

      // 2. Store invitation token as email verification token in the same transaction
      await manager.save(
        manager.create(EmailVerificationToken, {
          user_id: user.id,
          token: invitationToken,
          expires_at: expiresAt,
        }),
      );

      // 3. Create PENDING invitation — BusinessUser NOT created yet
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
      // Roll back if email delivery fails
      if (createdInvitationId) {
        await invRepo.delete({ id: createdInvitationId });
      }
      if (createdUserId) {
        await AuthRepository.deleteEmailTokensForUser(createdUserId);
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
