import { AppDataSource } from "../../../src/config/data-source";
import { AuthRepository } from "../../../src/modules/auth/auth.repository";
import { InvitationService } from "../../../src/modules/business/invitation.service";
import { BusinessService } from "../../../src/modules/business/business.service";
import { sendEmployeeInvitationEmail } from "../../../src/shared/utils/email";

jest.mock("../../../src/config/data-source", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
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
});
