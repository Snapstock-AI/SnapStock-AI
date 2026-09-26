import { AppDataSource } from "../../../src/config/data-source";
import { AuthRepository } from "../../../src/modules/auth/auth.repository";
import { InvitationService } from "../../../src/modules/business/invitation.service";
import { BusinessService } from "../../../src/modules/business/business.service";
import { sendEmployeeInvitationEmail } from "../../../src/shared/utils/email";

jest.mock("../../../src/config/data-source", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock("../../../src/modules/auth/auth.repository", () => ({
  AuthRepository: {
    findByEmailIncludingDeleted: jest.fn(),
  },
}));

jest.mock("../../../src/modules/business/business.service", () => ({
  BusinessService: {
    getMembership: jest.fn(),
  },
}));

jest.mock("../../../src/shared/utils/email", () => ({
  sendEmployeeInvitationEmail: jest.fn(),
}));

describe("InvitationService", () => {
  const mockedDataSource = AppDataSource as jest.Mocked<typeof AppDataSource>;
  const mockedAuthRepository = AuthRepository as jest.Mocked<
    typeof AuthRepository
  >;
  const mockedBusinessService = BusinessService as jest.Mocked<
    typeof BusinessService
  >;
  const mockedSendInvitationEmail =
    sendEmployeeInvitationEmail as jest.MockedFunction<
      typeof sendEmployeeInvitationEmail
    >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects an email that already has an account", async () => {
    mockedBusinessService.getMembership.mockResolvedValue({
      role: "OWNER",
      business_name: "Fresh Mart",
    } as never);
    mockedAuthRepository.findByEmailIncludingDeleted.mockResolvedValue({
      id: "employee-1",
      deleted_at: null,
    } as never);

    await expect(
      InvitationService.send("owner-1", "business-1", {
        email: "Employee@Example.com",
        full_name: "Employee One",
      }),
    ).rejects.toThrow("An account already exists for this email address.");

    expect(mockedAuthRepository.findByEmailIncludingDeleted).toHaveBeenCalledWith(
      "employee@example.com",
    );
    expect(mockedDataSource.getRepository).not.toHaveBeenCalled();
    expect(mockedSendInvitationEmail).not.toHaveBeenCalled();
  });

  describe("accept", () => {
    const invitation = () => ({
      id: "inv-1",
      business_id: "business-1",
      email: "employee@example.com",
      status: "PENDING",
      expires_at: new Date(Date.now() + 86400000),
      accepted_at: null as Date | null,
    });

    function mockTransaction(records: {
      invitation: ReturnType<typeof invitation> | null;
      user: { id: string; email: string } | null;
      membership?: unknown;
      anyMembership?: unknown;
    }) {
      const manager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(records.invitation)
          .mockResolvedValueOnce(records.user)
          .mockResolvedValueOnce(records.membership ?? null)
          .mockResolvedValueOnce(records.anyMembership ?? null),
        create: jest.fn((_entity, data) => data),
        save: jest.fn(async (data) => data),
      };
      (mockedDataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (m: typeof manager) => unknown) => cb(manager),
      );
      return manager;
    }

    it("adds the invited user to the business without requiring sign-in", async () => {
      const pending = invitation();
      const manager = mockTransaction({
        invitation: pending,
        user: { id: "employee-1", email: "employee@example.com" },
      });

      await expect(InvitationService.accept(" token-1 ")).resolves.toEqual({
        businessId: "business-1",
        email: "employee@example.com",
      });

      expect(manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          business_id: "business-1",
          user_id: "employee-1",
          role: "EMPLOYEE",
        }),
      );
      expect(pending.status).toBe("ACCEPTED");
      expect(pending.accepted_at).toBeInstanceOf(Date);
    });

    it("rejects an unknown token", async () => {
      mockTransaction({ invitation: null, user: null });

      await expect(InvitationService.accept("bad")).rejects.toThrow(
        "Invitation not found",
      );
    });

    it("marks an expired invitation as EXPIRED", async () => {
      const expired = { ...invitation(), expires_at: new Date(Date.now() - 1000) };
      const manager = mockTransaction({
        invitation: expired,
        user: { id: "employee-1", email: "employee@example.com" },
      });

      await expect(InvitationService.accept("token-1")).rejects.toThrow(
        "This invitation has expired.",
      );
      expect(expired.status).toBe("EXPIRED");
      expect(manager.create).not.toHaveBeenCalled();
    });

    it("is idempotent when the invitation was already accepted", async () => {
      const manager = mockTransaction({
        invitation: { ...invitation(), status: "ACCEPTED" },
        user: { id: "employee-1", email: "employee@example.com" },
        membership: { id: "membership-1" },
      });

      await expect(InvitationService.accept("token-1")).resolves.toEqual({
        businessId: "business-1",
        email: "employee@example.com",
      });
      expect(manager.save).not.toHaveBeenCalled();
    });
  });
});
