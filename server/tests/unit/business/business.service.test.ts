import { BusinessRepository } from "../../../src/modules/business/business.repository";
import { BusinessService } from "../../../src/modules/business/business.service";

jest.mock("../../../src/modules/business/business.repository", () => ({
  BusinessRepository: {
    createWithOwner: jest.fn(),
    findByUserId: jest.fn(),
  },
}));

describe("BusinessService.createForUser", () => {
  const mockedRepository = BusinessRepository as jest.Mocked<
    typeof BusinessRepository
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows creating another business when the user already has memberships", async () => {
    mockedRepository.findByUserId.mockResolvedValue([
      { business_id: "biz-1", role: "EMPLOYEE" },
    ] as never);
    mockedRepository.createWithOwner.mockResolvedValue({
      id: "biz-2",
      business_name: "Second Shop",
      business_email: "owner@shop.com",
      address: "Main St",
      contact_number: "011",
    } as never);

    const result = await BusinessService.createForUser("user-1", {
      business_name: "Second Shop",
      business_email: "owner@shop.com",
      address: "Main St",
      contact_number: "011",
    });

    expect(result).toEqual({
      id: "biz-2",
      business_name: "Second Shop",
      business_email: "owner@shop.com",
      address: "Main St",
      contact_number: "011",
      role: "OWNER",
    });
    expect(mockedRepository.createWithOwner).toHaveBeenCalled();
  });
});
