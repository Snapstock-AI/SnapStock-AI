/**
 * Employee invitation lifecycle: send, accept, legacy token activation and listing.
 * SRS: FR-TENANT-002 (invite employee), FR-TENANT-003 (only the owner invites).
 *
 * The happy paths "invite an existing user", "already a member of this business"
 * and "accept a second business" are covered in invitation.service.test.ts.
 */
import { AppDataSource } from "../../../src/config/data-source";
import { AuthRepository } from "../../../src/modules/auth/auth.repository";
import { BusinessService } from "../../../src/modules/business/business.service";
import { InvitationService } from "../../../src/modules/business/invitation.service";
import { sendEmployeeInvitationEmail } from "../../../src/shared/utils/email";

jest.mock("../../../src/config/data-source", () => ({
  AppDataSource: { getRepository: jest.fn(), transaction: jest.fn() },
}));
jest.mock("../../../src/modules/auth/auth.repository", () => ({
  AuthRepository: { findByEmailIncludingDeleted: jest.fn() },
}));
jest.mock("../../../src/modules/business/business.service", () => ({
  BusinessService: { getMembership: jest.fn() },
}));
jest.mock("../../../src/shared/utils/email", () => ({
  sendEmployeeInvitationEmail: jest.fn(),
}));

const dataSource = AppDataSource as jest.Mocked<typeof AppDataSource>;
const authRepository = AuthRepository as jest.Mocked<typeof AuthRepository>;
const businessService = BusinessService as jest.Mocked<typeof BusinessService>;
const sendEmail = sendEmployeeInvitationEmail as jest.MockedFunction<typeof sendEmployeeInvitationEmail>;

const DAY = 24 * 60 * 60 * 1000;
const future = () => new Date(Date.now() + DAY);
const past = () => new Date(Date.now() - 1000);

const entityName = (entity: unknown) =>
  typeof entity === "function" ? entity.name : String((entity as { name?: string })?.name ?? "");

/** Repositories returned by AppDataSource.getRepository, keyed by entity class name. */
function useRepositories(repositories: Record<string, object>) {
  dataSource.getRepository.mockImplementation((entity: unknown) => {
    const repository = repositories[entityName(entity)];
    if (!repository) throw new Error(`Unexpected repository: ${entityName(entity)}`);
    return repository as never;
  });
}

function invitationRepository(existing: object | null = null) {
  return {
    findOne: jest.fn().mockResolvedValue(existing),
    find: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(async (entity) => ({ id: "invite-new", ...entity })),
    delete: jest.fn(),
    update: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  businessService.getMembership.mockResolvedValue({ role: "OWNER", business_name: "Fresh Mart" } as never);
  authRepository.findByEmailIncludingDeleted.mockResolvedValue(null);
  sendEmail.mockResolvedValue(undefined as never);
});

describe("send", () => {
  it.each([
    ["an EMPLOYEE", { role: "EMPLOYEE", business_name: "Fresh Mart" }],
    ["a non-member", null],
  ])("refuses when the sender is %s and sends no email", async (_label, membership) => {
    businessService.getMembership.mockResolvedValue(membership as never);

    await expect(
      InvitationService.send("user-1", "biz-1", { email: "new@example.com" }),
    ).rejects.toThrow("Only the business owner can invite employees.");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("requires an email", async () => {
    await expect(InvitationService.send("owner-1", "biz-1", { email: "   " })).rejects.toThrow(
      "Employee email is required.",
    );
  });

  it("refuses an email that belongs to a removed account", async () => {
    authRepository.findByEmailIncludingDeleted.mockResolvedValue({
      id: "old-user",
      deleted_at: new Date(),
    } as never);

    await expect(
      InvitationService.send("owner-1", "biz-1", { email: "gone@example.com" }),
    ).rejects.toThrow("This email belongs to a removed account and cannot be reused.");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("invites someone who has no account yet, with a normalised email and a 7-day expiry", async () => {
    const invitations = invitationRepository();
    useRepositories({ EmployeeInvitation: invitations });

    const result = await InvitationService.send("owner-1", "biz-1", {
      email: "  New.Person@Example.COM ",
      full_name: "  New Person ",
    });

    const saved = invitations.create.mock.calls[0][0];
    expect(saved).toMatchObject({
      business_id: "biz-1",
      invited_by: "owner-1",
      email: "new.person@example.com",
      role: "EMPLOYEE",
      status: "PENDING",
    });
    expect(saved.invitation_token).toMatch(/^[0-9a-f]{64}$/);
    const days = (saved.expires_at.getTime() - Date.now()) / DAY;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7);
    expect(sendEmail).toHaveBeenCalledWith(
      "new.person@example.com",
      saved.invitation_token,
      "Fresh Mart",
      "New Person",
    );
    expect(result).toMatchObject({ email: "new.person@example.com", status: "PENDING" });
    expect(result).not.toHaveProperty("invitation_token");
  });

  it("refuses a second invitation while an unexpired one is pending", async () => {
    const invitations = invitationRepository({ id: "invite-1", status: "PENDING", expires_at: future() });
    useRepositories({ EmployeeInvitation: invitations });

    await expect(
      InvitationService.send("owner-1", "biz-1", { email: "new@example.com" }),
    ).rejects.toThrow("A pending invitation already exists for this email.");
    expect(invitations.create).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("expires an old pending invitation and sends a new one", async () => {
    const stale = { id: "invite-old", status: "PENDING", expires_at: past() };
    const invitations = invitationRepository(stale);
    useRepositories({ EmployeeInvitation: invitations });

    await InvitationService.send("owner-1", "biz-1", { email: "new@example.com" });

    expect(invitations.save).toHaveBeenCalledWith(expect.objectContaining({ id: "invite-old", status: "EXPIRED" }));
    expect(invitations.create).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("removes the new invitation again if the email cannot be sent", async () => {
    const invitations = invitationRepository();
    useRepositories({ EmployeeInvitation: invitations });
    sendEmail.mockRejectedValue(new Error("SMTP down"));

    await expect(
      InvitationService.send("owner-1", "biz-1", { email: "new@example.com" }),
    ).rejects.toThrow("SMTP down");
    expect(invitations.delete).toHaveBeenCalledWith({ id: "invite-new" });
  });
});

describe("accept", () => {
  const pending = (overrides: object = {}) => ({
    id: "invite-1",
    business_id: "biz-1",
    email: "emp@example.com",
    status: "PENDING",
    expires_at: future(),
    accepted_at: null,
    ...overrides,
  });

  /**
   * Runs accept() inside a fake transaction. `records` is what manager.findOne returns
   * for each entity; `membership` may be a list for successive BusinessUser lookups.
   */
  function withTransaction(records: {
    invitation?: object | null;
    user?: object | null;
    membership?: Array<object | null>;
    saveMembershipError?: object;
  }) {
    const memberships = [...(records.membership ?? [null])];
    const manager = {
      findOne: jest.fn(async (entity: unknown) => {
        switch (entityName(entity)) {
          case "EmployeeInvitation":
            return records.invitation ?? null;
          case "User":
            return records.user ?? null;
          case "BusinessUser":
            return memberships.length > 1 ? memberships.shift() : memberships[0];
          default:
            return null;
        }
      }),
      create: jest.fn((_entity: unknown, data: object) => ({ __membership: true, ...data })),
      save: jest.fn(async (entity: { __membership?: boolean }) => {
        if (entity.__membership && records.saveMembershipError) throw records.saveMembershipError;
        return entity;
      }),
    };
    dataSource.transaction.mockImplementation(async (work: any) => work(manager));
    return manager;
  }

  const user = (overrides: object = {}) => ({
    id: "user-1",
    email: "Emp@Example.com",
    email_verified: true,
    ...overrides,
  });

  it("requires a token", async () => {
    await expect(InvitationService.accept("user-1", "   ")).rejects.toThrow(
      "Invitation token is required.",
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it("looks the invitation up by the trimmed token", async () => {
    const manager = withTransaction({ invitation: pending(), user: user() });

    await InvitationService.accept("user-1", "  token-abc  ");

    expect(manager.findOne).toHaveBeenCalledWith(expect.anything(), {
      where: { invitation_token: "token-abc" },
    });
  });

  it("rejects an unknown token", async () => {
    withTransaction({ invitation: null, user: user() });

    await expect(InvitationService.accept("user-1", "nope")).rejects.toThrow(
      "Invitation not found. Ask the owner to send a new invitation.",
    );
  });

  it("rejects a user signed in with a different email", async () => {
    const manager = withTransaction({ invitation: pending(), user: user({ email: "someone@else.com" }) });

    await expect(InvitationService.accept("user-1", "token")).rejects.toThrow(
      "Sign in with the email address that received this invitation.",
    );
    expect(manager.create).not.toHaveBeenCalled();
  });

  it("matches the invited email case-insensitively and creates an EMPLOYEE membership", async () => {
    const manager = withTransaction({ invitation: pending(), user: user() });

    await expect(InvitationService.accept("user-1", "token")).resolves.toEqual({ businessId: "biz-1" });

    expect(manager.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ business_id: "biz-1", user_id: "user-1", role: "EMPLOYEE" }),
    );
    expect(manager.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "invite-1", status: "ACCEPTED", accepted_at: expect.any(Date) }),
    );
  });

  it("is idempotent: an already accepted invitation with an existing membership just returns the business", async () => {
    const manager = withTransaction({
      invitation: pending({ status: "ACCEPTED" }),
      user: user(),
      membership: [{ user_id: "user-1", business_id: "biz-1" }],
    });

    await expect(InvitationService.accept("user-1", "token")).resolves.toEqual({ businessId: "biz-1" });
    expect(manager.save).not.toHaveBeenCalled();
  });

  it.each(["ACCEPTED", "EXPIRED", "CANCELLED"])(
    "rejects an invitation whose status is %s (without a membership)",
    async (status) => {
      withTransaction({ invitation: pending({ status }), user: user() });

      await expect(InvitationService.accept("user-1", "token")).rejects.toThrow(
        "This invitation is invalid or has already been used.",
      );
    },
  );

  it("marks an expired invitation EXPIRED and refuses it", async () => {
    const manager = withTransaction({ invitation: pending({ expires_at: past() }), user: user() });

    await expect(InvitationService.accept("user-1", "token")).rejects.toThrow(
      "This invitation has expired.",
    );
    expect(manager.save).toHaveBeenCalledWith(expect.objectContaining({ status: "EXPIRED" }));
    expect(manager.create).not.toHaveBeenCalled();
  });

  it("does not create a second membership when the user already belongs to that business", async () => {
    const manager = withTransaction({
      invitation: pending(),
      user: user(),
      membership: [{ user_id: "user-1", business_id: "biz-1" }],
    });

    await expect(InvitationService.accept("user-1", "token")).resolves.toEqual({ businessId: "biz-1" });
    expect(manager.create).not.toHaveBeenCalled();
    expect(manager.save).toHaveBeenCalledWith(expect.objectContaining({ status: "ACCEPTED" }));
  });

  it("verifies the email of an unverified user, since the invitation link proves ownership", async () => {
    const manager = withTransaction({ invitation: pending(), user: user({ email_verified: false }) });

    await InvitationService.accept("user-1", "token");

    expect(manager.save).toHaveBeenCalledWith(expect.objectContaining({ id: "user-1", email_verified: true }));
  });

  it("treats a concurrent accept (duplicate key) as success when the membership now exists", async () => {
    const manager = withTransaction({
      invitation: pending(),
      user: user(),
      membership: [null, { user_id: "user-1", business_id: "biz-1" }],
      saveMembershipError: { code: "23505" },
    });

    await expect(InvitationService.accept("user-1", "token")).resolves.toEqual({ businessId: "biz-1" });
    expect(manager.save).toHaveBeenLastCalledWith(expect.objectContaining({ status: "ACCEPTED" }));
  });

  it("explains the failure when a duplicate key occurs but no membership exists", async () => {
    withTransaction({
      invitation: pending(),
      user: user(),
      membership: [null, null],
      saveMembershipError: { code: "23505" },
    });

    await expect(InvitationService.accept("user-1", "token")).rejects.toThrow(
      /Could not join this business/,
    );
  });

  it("passes on unexpected database errors unchanged", async () => {
    withTransaction({
      invitation: pending(),
      user: user(),
      saveMembershipError: new Error("connection lost"),
    });

    await expect(InvitationService.accept("user-1", "token")).rejects.toThrow("connection lost");
  });
});

describe("activateByToken (legacy invitation links)", () => {
  function setup(invitation: object | null, existingMembership: object | null = null) {
    const invitations = invitationRepository(invitation);
    const memberships = {
      findOne: jest.fn().mockResolvedValue(existingMembership),
      create: jest.fn((data) => data),
      save: jest.fn(async (entity) => entity),
    };
    useRepositories({ EmployeeInvitation: invitations, BusinessUser: memberships });
    return { invitations, memberships };
  }

  it("returns null when the token is not a pending invitation", async () => {
    const { invitations } = setup(null);

    await expect(InvitationService.activateByToken("user-1", "token")).resolves.toBeNull();
    expect(invitations.findOne).toHaveBeenCalledWith({
      where: { invitation_token: "token", status: "PENDING" },
    });
  });

  it("expires an out-of-date invitation and refuses it", async () => {
    const { invitations, memberships } = setup({ id: "invite-1", business_id: "biz-1", expires_at: past() });

    await expect(InvitationService.activateByToken("user-1", "token")).rejects.toThrow(
      "This invitation link has expired. Ask your owner to resend the invitation.",
    );
    expect(invitations.update).toHaveBeenCalledWith({ id: "invite-1" }, { status: "EXPIRED" });
    expect(memberships.save).not.toHaveBeenCalled();
  });

  it("joins the business as EMPLOYEE and marks the invitation ACCEPTED", async () => {
    const { invitations, memberships } = setup({ id: "invite-1", business_id: "biz-1", expires_at: future() });

    await expect(InvitationService.activateByToken("user-1", "token")).resolves.toEqual({ businessId: "biz-1" });
    expect(memberships.create).toHaveBeenCalledWith(
      expect.objectContaining({ business_id: "biz-1", user_id: "user-1", role: "EMPLOYEE" }),
    );
    expect(invitations.update).toHaveBeenCalledWith(
      { id: "invite-1" },
      expect.objectContaining({ status: "ACCEPTED" }),
    );
  });

  it("does not duplicate an existing membership", async () => {
    const { memberships } = setup(
      { id: "invite-1", business_id: "biz-1", expires_at: future() },
      { user_id: "user-1", business_id: "biz-1" },
    );

    await InvitationService.activateByToken("user-1", "token");

    expect(memberships.save).not.toHaveBeenCalled();
  });
});

describe("list", () => {
  it("refuses anyone who is not the owner", async () => {
    businessService.getMembership.mockResolvedValue({ role: "EMPLOYEE", business_name: "Fresh Mart" } as never);

    await expect(InvitationService.list("user-1", "biz-1")).rejects.toThrow(
      "Only the business owner can view invitations.",
    );
  });

  it("returns the business's invitations newest first, without their secret tokens", async () => {
    const invitations = invitationRepository();
    invitations.find.mockResolvedValue([
      {
        id: "invite-1",
        email: "emp@example.com",
        role: "EMPLOYEE",
        status: "PENDING",
        expires_at: future(),
        created_at: new Date(),
        accepted_at: null,
        invitation_token: "secret",
      },
    ]);
    useRepositories({ EmployeeInvitation: invitations });

    const result = await InvitationService.list("owner-1", "biz-1");

    expect(invitations.find).toHaveBeenCalledWith({
      where: { business_id: "biz-1" },
      order: { created_at: "DESC" },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty("invitation_token");
    expect(result[0]).toMatchObject({ id: "invite-1", status: "PENDING" });
  });
});
