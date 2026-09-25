import crypto from "crypto";
import { AppDataSource } from "../../config/data-source";
import { EmployeeInvitation } from "../../entities/EmployeeInvitation";
import { User } from "../../entities/User";
import { BusinessUser } from "../../entities/BusinessUser";
import { BusinessService } from "./business.service";
import { AuthRepository } from "../auth/auth.repository";
import { sendEmployeeInvitationEmail } from "../../shared/utils/email";

const INVITATION_VALIDITY_DAYS = 7;

export class InvitationService {
  /**
   * Logged-in user accepts an invite for the email that received it.
   * Joins that business as EMPLOYEE without leaving other workspaces.
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

      if (existingMembership) {
        invitation.status = "ACCEPTED";
        invitation.accepted_at = new Date();
        await manager.save(invitation);
        return { businessId: invitation.business_id };
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
   * Legacy helper used when an old invite token doubles as an email-verification
   * token. Safe no-op when the token is only an EmployeeInvitation.
   */
  static async activateByToken(userId: string, token: string) {
    const repo = AppDataSource.getRepository(EmployeeInvitation);

    const invitation = await repo.findOne({
      where: { invitation_token: token, status: "PENDING" },
    });

    if (!invitation) {
      return null;
    }

    if (invitation.expires_at <= new Date()) {
      await repo.update({ id: invitation.id }, { status: "EXPIRED" });
      throw new Error(
        "This invitation link has expired. Ask your owner to resend the invitation.",
      );
    }

    const membershipRepo = AppDataSource.getRepository(BusinessUser);
    const existingForBusiness = await membershipRepo.findOne({
      where: { user_id: userId, business_id: invitation.business_id },
    });

    if (!existingForBusiness) {
      await membershipRepo.save(
        membershipRepo.create({
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
   * Owner invites by email only. Does not create users or temporary passwords.
   * Recipient signs up or logs in normally, then accepts the invite link.
   */
  static async send(
    invitedBy: string,
    businessId: string,
    details: {
      email: string;
      full_name?: string;
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
    if (!normalizedEmail) {
      throw new Error("Employee email is required.");
    }

    const recipient =
      await AuthRepository.findByEmailIncludingDeleted(normalizedEmail);

    if (recipient?.deleted_at) {
      throw new Error(
        "This email belongs to a removed account and cannot be reused.",
      );
    }

    if (recipient) {
      const alreadyMember = await AppDataSource.getRepository(BusinessUser).exist({
        where: { user_id: recipient.id, business_id: businessId },
      });
      if (alreadyMember) {
        throw new Error("This person is already a member of this business.");
      }
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
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_VALIDITY_DAYS);

    const invitation = await invRepo.save(
      invRepo.create({
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
        details.full_name?.trim() || undefined,
      );
    } catch (emailError) {
      await invRepo.delete({ id: invitation.id });
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
