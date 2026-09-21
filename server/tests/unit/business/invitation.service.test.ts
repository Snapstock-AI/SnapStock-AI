import { AppDataSource } from "../../../src/config/data-source";
import { InvitationService } from "../../../src/modules/business/invitation.service";
import { BusinessService } from "../../../src/modules/business/business.service";
import { sendEmployeeInvitationEmail } from "../../../src/shared/utils/email";

jest.mock("../../../src/config/data-source", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock("../../../src/modules/business/business.service", () => ({
  BusinessService: {
    getMembership: jest.fn(),
    findBusinessIdByUserId: jest.fn(),
  },
}));

jest.mock("../../../src/shared/utils/email", () => ({
  sendEmployeeInvitationEmail: jest.fn(),
}));

describe("InvitationService", () => {
  const mockedDataSource = AppDataSource as jest.Mocked<typeof AppDataSource>;
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

  it("rejects a recipient who already belongs to a business", async () => {
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({ id: "employee-1" }),
    };
    const invitationRepository = {
      findOne: jest.fn(),
    };

    mockedDataSource.getRepository
      .mockReturnValueOnce(userRepository as never)
      .mockReturnValueOnce(invitationRepository as never);
    mockedBusinessService.getMembership.mockResolvedValue({
      role: "OWNER",
      business_name: "Fresh Mart",
    });
    mockedBusinessService.findBusinessIdByUserId.mockResolvedValue(
      "other-business",
    );

    await expect(
      InvitationService.send("owner-1", "business-1", "Employee@Example.com"),
    ).rejects.toThrow("This user already belongs to a business.");

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { email: "employee@example.com" },
      select: { id: true },
    });
    expect(invitationRepository.findOne).not.toHaveBeenCalled();
    expect(mockedSendInvitationEmail).not.toHaveBeenCalled();
  });
});
