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

  it("sends an invite for an existing user who is not yet a member", async () => {
    mockedBusinessService.getMembership.mockResolvedValue({
      role: "OWNER",
      business_name: "Fresh Mart",
    } as never);
    mockedAuthRepository.findByEmailIncludingDeleted.mockResolvedValue({
      id: "employee-1",
      deleted_at: null,
    } as never);

    const membershipExist = jest.fn().mockResolvedValue(false);
    const invitationFindOne = jest.fn().mockResolvedValue(null);
    const invitationSave = jest.fn().mockImplementation(async (entity) => ({
      id: "invite-1",
      email: "employee@example.com",
      role: "EMPLOYEE",
      status: "PENDING",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ...entity,
    }));
    const invitationCreate = jest.fn((data) => data);
    const invitationDelete = jest.fn();

    mockedDataSource.getRepository.mockImplementation((entity: unknown) => {
      const name =
        typeof entity === "function"
          ? entity.name
          : String((entity as { name?: string })?.name || "");
      if (name === "BusinessUser") {
        return { exist: membershipExist } as never;
      }
      if (name === "EmployeeInvitation") {
        return {
          findOne: invitationFindOne,
          save: invitationSave,
          create: invitationCreate,
          delete: invitationDelete,
        } as never;
      }
      throw new Error(`Unexpected repository: ${name}`);
    });

    mockedSendInvitationEmail.mockResolvedValue(undefined as never);

    const result = await InvitationService.send("owner-1", "business-1", {
      email: "Employee@Example.com",
      full_name: "Employee One",
    });

    expect(result.email).toBe("employee@example.com");
    expect(result.status).toBe("PENDING");
    expect(membershipExist).toHaveBeenCalledWith({
      where: { user_id: "employee-1", business_id: "business-1" },
    });
    expect(mockedSendInvitationEmail).toHaveBeenCalledWith(
      "employee@example.com",
      expect.any(String),
      "Fresh Mart",
      "Employee One",
    );
  });

  it("rejects when the email is already a member of this business", async () => {
    mockedBusinessService.getMembership.mockResolvedValue({
      role: "OWNER",
      business_name: "Fresh Mart",
    } as never);
    mockedAuthRepository.findByEmailIncludingDeleted.mockResolvedValue({
      id: "employee-1",
      deleted_at: null,
    } as never);

    mockedDataSource.getRepository.mockReturnValue({
      exist: jest.fn().mockResolvedValue(true),
    } as never);

    await expect(
      InvitationService.send("owner-1", "business-1", {
        email: "employee@example.com",
      }),
    ).rejects.toThrow("This person is already a member of this business.");

    expect(mockedSendInvitationEmail).not.toHaveBeenCalled();
  });

  it("accepts an invite for a second business without clearing other memberships", async () => {
    const invitation = {
      id: "invite-2",
      business_id: "business-2",
      email: "member@example.com",
      status: "PENDING",
      expires_at: new Date(Date.now() + 60_000),
      invitation_token: "token-abc",
    };
    const user = {
      id: "user-1",
      email: "member@example.com",
      email_verified: true,
    };

    const manager = {
      findOne: jest.fn(async (entity: { name: string }, options: any) => {
        if (entity.name === "EmployeeInvitation") return invitation;
        if (entity.name === "User") return user;
        if (entity.name === "BusinessUser") return null;
        return null;
      }),
      create: jest.fn((_entity, data) => data),
      save: jest.fn(async (entity) => entity),
    };

    mockedDataSource.transaction.mockImplementation(async (cb: any) =>
      cb(manager),
    );

    const result = await InvitationService.accept("user-1", "token-abc");

    expect(result).toEqual({ businessId: "business-2" });
    expect(manager.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        business_id: "business-2",
        user_id: "user-1",
        role: "EMPLOYEE",
      }),
    );
    expect(manager.save).toHaveBeenCalled();
  });
});
