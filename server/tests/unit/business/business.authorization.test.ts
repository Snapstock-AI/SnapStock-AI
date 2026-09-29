/**
 * Business membership and owner-only authorization rules.
 * SRS: FR-TENANT-001 (onboarding), FR-TENANT-003 (roles), NFR-SEC-003 (tenant isolation).
 */
import { BusinessRepository } from "../../../src/modules/business/business.repository";
import { BusinessService } from "../../../src/modules/business/business.service";

jest.mock("../../../src/modules/business/business.repository", () => ({
  BusinessRepository: {
    findByUserId: jest.fn(),
    findBusinessIdByUserId: jest.fn(),
    createWithOwner: jest.fn(),
    isMember: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findEmployeesByBusinessId: jest.fn(),
    findMembership: jest.fn(),
    removeEmployee: jest.fn(),
  },
}));

const repo = BusinessRepository as jest.Mocked<typeof BusinessRepository>;

const BUSINESS = {
  id: "biz-1",
  business_name: "Fresh Mart",
  business_email: "shop@example.com",
  address: "1 Main St",
  contact_number: "0771234567",
};

/** The caller's memberships, in the shape BusinessRepository.findByUserId returns. */
function memberships(...items: Array<{ businessId: string; role: "OWNER" | "EMPLOYEE" }>) {
  repo.findByUserId.mockResolvedValue(
    items.map(({ businessId, role }) => ({
      business_id: businessId,
      role,
      business: { ...BUSINESS, id: businessId },
    })) as never,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getMembership", () => {
  it("returns the caller's role and business name for a business they belong to", async () => {
    memberships({ businessId: "biz-1", role: "EMPLOYEE" });

    await expect(BusinessService.getMembership("user-1", "biz-1")).resolves.toEqual({
      role: "EMPLOYEE",
      business_name: "Fresh Mart",
    });
  });

  it("returns null for a business the caller does not belong to", async () => {
    memberships({ businessId: "biz-1", role: "OWNER" });

    await expect(BusinessService.getMembership("user-1", "biz-2")).resolves.toBeNull();
  });
});

describe("listForUser (workspace list)", () => {
  it("lists every business the user belongs to with their role in each", async () => {
    memberships({ businessId: "biz-1", role: "OWNER" }, { businessId: "biz-2", role: "EMPLOYEE" });

    const result = await BusinessService.listForUser("user-1");

    expect(result.map((b) => [b.id, b.role])).toEqual([
      ["biz-1", "OWNER"],
      ["biz-2", "EMPLOYEE"],
    ]);
  });

  it("fills in the default alert thresholds (freshness 65, low stock 25) when none are set", async () => {
    memberships({ businessId: "biz-1", role: "OWNER" });

    const [business] = await BusinessService.listForUser("user-1");

    expect(business.freshness_alert_threshold).toBe(65);
    expect(business.low_stock_threshold).toBe(25);
  });

  it("returns an empty list for a user with no business", async () => {
    repo.findByUserId.mockResolvedValue([]);

    await expect(BusinessService.listForUser("user-1")).resolves.toEqual([]);
  });
});

describe("createForUser (business onboarding)", () => {
  it("creates the business with the caller as OWNER and returns only public fields", async () => {
    repo.createWithOwner.mockResolvedValue({ ...BUSINESS, internal_note: "x" } as never);
    const input = {
      business_name: BUSINESS.business_name,
      business_email: BUSINESS.business_email,
      address: BUSINESS.address,
      contact_number: BUSINESS.contact_number,
    };

    const result = await BusinessService.createForUser("user-1", input);

    expect(repo.createWithOwner).toHaveBeenCalledWith("user-1", input);
    expect(result).toEqual({ ...BUSINESS, role: "OWNER" });
  });
});

describe("assertMember", () => {
  it("allows a member", async () => {
    repo.isMember.mockResolvedValue(true);

    await expect(BusinessService.assertMember("user-1", "biz-1")).resolves.toBeUndefined();
  });

  it("rejects a non-member", async () => {
    repo.isMember.mockResolvedValue(false);

    await expect(BusinessService.assertMember("user-1", "biz-1")).rejects.toThrow(
      "You do not belong to this business",
    );
  });
});

describe("assertOwner", () => {
  it("allows the OWNER", async () => {
    memberships({ businessId: "biz-1", role: "OWNER" });

    await expect(BusinessService.assertOwner("user-1", "biz-1")).resolves.toBeUndefined();
  });

  it.each([
    ["an EMPLOYEE", () => memberships({ businessId: "biz-1", role: "EMPLOYEE" })],
    ["a non-member", () => memberships({ businessId: "biz-2", role: "OWNER" })],
  ])("rejects %s", async (_label, setup) => {
    setup();

    await expect(BusinessService.assertOwner("user-1", "biz-1")).rejects.toThrow(
      "Only the business owner can access this area.",
    );
  });

  it("an OWNER of one business is not an owner of another business", async () => {
    memberships({ businessId: "biz-1", role: "OWNER" }, { businessId: "biz-2", role: "EMPLOYEE" });

    await expect(BusinessService.assertOwner("user-1", "biz-2")).rejects.toThrow(
      "Only the business owner can access this area.",
    );
  });
});

describe("owner-only operations reject EMPLOYEEs and non-members", () => {
  const cases: Array<[string, () => Promise<unknown>, string]> = [
    ["updateForOwner", () => BusinessService.updateForOwner("user-1", "biz-1", { business_name: "X" }), "Only the business owner can update business details."],
    ["deleteForOwner", () => BusinessService.deleteForOwner("user-1", "biz-1"), "Only the business owner can delete the business."],
    ["listEmployees", () => BusinessService.listEmployees("user-1", "biz-1"), "Only the business owner can view employees."],
    ["removeEmployee", () => BusinessService.removeEmployee("user-1", "biz-1", "emp-1"), "Only the business owner can remove employees."],
  ];

  describe.each([
    ["EMPLOYEE", () => memberships({ businessId: "biz-1", role: "EMPLOYEE" })],
    ["non-member", () => memberships({ businessId: "other-biz", role: "OWNER" })],
  ])("as %s", (_label, setup) => {
    it.each(cases)("%s is refused and nothing is changed", async (_name, action, message) => {
      setup();

      await expect(action()).rejects.toThrow(message);

      expect(repo.update).not.toHaveBeenCalled();
      expect(repo.delete).not.toHaveBeenCalled();
      expect(repo.removeEmployee).not.toHaveBeenCalled();
      expect(repo.findEmployeesByBusinessId).not.toHaveBeenCalled();
    });
  });
});

describe("updateForOwner", () => {
  beforeEach(() => memberships({ businessId: "biz-1", role: "OWNER" }));

  it("applies the changes and returns the saved business with its thresholds", async () => {
    repo.findById.mockResolvedValue({ ...BUSINESS } as never);
    repo.update.mockImplementation(async (business) => business as never);

    const result = await BusinessService.updateForOwner("user-1", "biz-1", {
      business_name: "Fresh Mart Plus",
      low_stock_threshold: 10,
    });

    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ business_name: "Fresh Mart Plus", low_stock_threshold: 10 }),
    );
    expect(result).toMatchObject({
      business_name: "Fresh Mart Plus",
      low_stock_threshold: 10,
      freshness_alert_threshold: 65,
      role: "OWNER",
    });
  });

  it("reports a missing business", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      BusinessService.updateForOwner("user-1", "biz-1", { business_name: "X" }),
    ).rejects.toThrow("Business not found.");
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe("deleteForOwner", () => {
  beforeEach(() => memberships({ businessId: "biz-1", role: "OWNER" }));

  it("deletes the business", async () => {
    repo.delete.mockResolvedValue({ affected: 1 } as never);

    await expect(BusinessService.deleteForOwner("user-1", "biz-1")).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith("biz-1");
  });

  it("reports a business that no longer exists", async () => {
    repo.delete.mockResolvedValue({ affected: 0 } as never);

    await expect(BusinessService.deleteForOwner("user-1", "biz-1")).rejects.toThrow(
      "Business not found.",
    );
  });
});

describe("employees", () => {
  beforeEach(() => memberships({ businessId: "biz-1", role: "OWNER" }));

  it("the owner can list the employees of their business", async () => {
    const employees = [{ user_id: "emp-1", full_name: "Ann", role: "EMPLOYEE" }];
    repo.findEmployeesByBusinessId.mockResolvedValue(employees as never);

    await expect(BusinessService.listEmployees("user-1", "biz-1")).resolves.toEqual(employees);
    expect(repo.findEmployeesByBusinessId).toHaveBeenCalledWith("biz-1");
  });

  it("the owner can remove an EMPLOYEE from their business", async () => {
    repo.findMembership.mockResolvedValue({ user_id: "emp-1", role: "EMPLOYEE" } as never);

    await BusinessService.removeEmployee("user-1", "biz-1", "emp-1");

    expect(repo.removeEmployee).toHaveBeenCalledWith("emp-1", "biz-1");
  });

  it.each([
    ["an OWNER", { user_id: "owner-2", role: "OWNER" }],
    ["someone who is not a member", null],
  ])("refuses to remove %s", async (_label, membership) => {
    repo.findMembership.mockResolvedValue(membership as never);

    await expect(BusinessService.removeEmployee("user-1", "biz-1", "x")).rejects.toThrow(
      "Employee not found in this business.",
    );
    expect(repo.removeEmployee).not.toHaveBeenCalled();
  });
});
