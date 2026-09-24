/**
 * RBAC and tenant-isolation rules enforced in the service layer.
 * SRS: FR-TENANT-002/003, NFR-SEC-003.
 */
import { BusinessService } from "../../../src/modules/business/business.service";
import { BusinessRepository } from "../../../src/modules/business/business.repository";
import { ShelfService } from "../../../src/modules/shelf/shelf.service";
import { ShelfRepository } from "../../../src/modules/shelf/shelf.repository";

jest.mock("../../../src/modules/business/business.repository", () => ({
  BusinessRepository: {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    findMembership: jest.fn(),
    isMember: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    removeEmployee: jest.fn(),
    findEmployeesByBusinessId: jest.fn(),
    createWithOwner: jest.fn(),
  },
}));
jest.mock("../../../src/modules/shelf/shelf.repository", () => ({
  ShelfRepository: {
    findByBusinessId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  },
}));

const biz = BusinessRepository as jest.Mocked<typeof BusinessRepository>;
const shelves = ShelfRepository as jest.Mocked<typeof ShelfRepository>;

const BUSINESS_A = "aaaaaaaa-0000-4000-8000-000000000001";
const BUSINESS_B = "bbbbbbbb-0000-4000-8000-000000000002";

const membership = (role: "OWNER" | "EMPLOYEE", businessId = BUSINESS_A) =>
  ({ business_id: businessId, role, business: { business_name: "A Store" } }) as never;

describe("OWNER-only business operations (FR-TENANT-003)", () => {
  it.each([
    ["update the business", () => BusinessService.updateForOwner("u", BUSINESS_A, {} as never)],
    ["delete the business", () => BusinessService.deleteForOwner("u", BUSINESS_A)],
    ["list employees", () => BusinessService.listEmployees("u", BUSINESS_A)],
    ["remove an employee", () => BusinessService.removeEmployee("u", BUSINESS_A, "e1")],
  ])("an EMPLOYEE cannot %s", async (_label, act) => {
    biz.findByUserId.mockResolvedValue([membership("EMPLOYEE")]);

    await expect(act()).rejects.toThrow(/only the business owner/i);
    expect(biz.update).not.toHaveBeenCalled();
    expect(biz.delete).not.toHaveBeenCalled();
    expect(biz.removeEmployee).not.toHaveBeenCalled();
  });

  it("an OWNER of business B cannot update business A", async () => {
    biz.findByUserId.mockResolvedValue([membership("OWNER", BUSINESS_B)]);

    await expect(
      BusinessService.updateForOwner("u", BUSINESS_A, { business_name: "hijack" } as never),
    ).rejects.toThrow(/only the business owner/i);
    expect(biz.update).not.toHaveBeenCalled();
  });

  it("an OWNER can list employees of their own business", async () => {
    biz.findByUserId.mockResolvedValue([membership("OWNER")]);
    biz.findEmployeesByBusinessId.mockResolvedValue([{ id: "e1" }] as never);

    await expect(BusinessService.listEmployees("u", BUSINESS_A)).resolves.toEqual([{ id: "e1" }]);
  });

  it("cannot remove a member who is an OWNER, only EMPLOYEEs", async () => {
    biz.findByUserId.mockResolvedValue([membership("OWNER")]);
    biz.findMembership.mockResolvedValue({ role: "OWNER" } as never);

    await expect(BusinessService.removeEmployee("u", BUSINESS_A, "other-owner")).rejects.toThrow(
      /employee not found/i,
    );
    expect(biz.removeEmployee).not.toHaveBeenCalled();
  });

  it("a user who already belongs to a business cannot create a second one", async () => {
    biz.findByUserId.mockResolvedValue([membership("OWNER")]);

    await expect(
      BusinessService.createForUser("u", { business_name: "Second" } as never),
    ).rejects.toThrow(/already belongs/i);
    expect(biz.createWithOwner).not.toHaveBeenCalled();
  });
});

describe("tenant isolation for shelves (NFR-SEC-003)", () => {
  it("refuses to list shelves of a business the caller is not a member of", async () => {
    biz.isMember.mockResolvedValue(false);

    await expect(ShelfService.listForBusiness("u", BUSINESS_B)).rejects.toThrow(
      /do not belong/i,
    );
    expect(shelves.findByBusinessId).not.toHaveBeenCalled();
  });

  it("refuses to create a shelf in another tenant", async () => {
    biz.isMember.mockResolvedValue(false);

    await expect(ShelfService.create("u", BUSINESS_B, "Fruit")).rejects.toThrow(/do not belong/i);
    expect(shelves.create).not.toHaveBeenCalled();
  });

  it("IDOR: knowing another tenant's shelf id does not allow editing it", async () => {
    shelves.findById.mockResolvedValue({ id: "s-b", business_id: BUSINESS_B } as never);
    biz.isMember.mockResolvedValue(false);

    await expect(ShelfService.update("u", "s-b", "renamed")).rejects.toThrow(/do not belong/i);
    expect(biz.isMember).toHaveBeenCalledWith("u", BUSINESS_B);
    expect(shelves.update).not.toHaveBeenCalled();
  });

  it("IDOR: knowing another tenant's shelf id does not allow deleting it", async () => {
    shelves.findById.mockResolvedValue({ id: "s-b", business_id: BUSINESS_B } as never);
    biz.isMember.mockResolvedValue(false);

    await expect(ShelfService.remove("u", "s-b")).rejects.toThrow(/do not belong/i);
    expect(shelves.softDelete).not.toHaveBeenCalled();
  });

  it("a member creates a shelf scoped to their own business with trimmed input", async () => {
    biz.isMember.mockResolvedValue(true);
    shelves.create.mockImplementation(async (d: never) => d);

    const created = await ShelfService.create("u", BUSINESS_A, "  Bananas  ", "  Fruit ");

    expect(created).toMatchObject({ business_id: BUSINESS_A, name: "Bananas", category: "Fruit" });
  });

  it("removing a shelf is a soft delete of the found record", async () => {
    const shelf = { id: "s-a", business_id: BUSINESS_A };
    shelves.findById.mockResolvedValue(shelf as never);
    biz.isMember.mockResolvedValue(true);

    await ShelfService.remove("u", "s-a");

    expect(shelves.softDelete).toHaveBeenCalledWith(shelf);
  });

  it("reports a missing shelf without leaking whether it belongs to someone else", async () => {
    shelves.findById.mockResolvedValue(null);

    await expect(ShelfService.remove("u", "missing")).rejects.toThrow(/shelf not found/i);
    expect(biz.isMember).not.toHaveBeenCalled();
  });
});

// KNOWN DEFECT TD-02: FR-TENANT-003 says EMPLOYEE has "operational access" and
// destructive catalog operations such as delete need OWNER; today any member,
// including an EMPLOYEE, can soft-delete a shelf.
describe("role restriction on shelf deletion", () => {
  it.failing("an EMPLOYEE cannot delete a shelf (SRS: destructive action requires OWNER)", async () => {
    const shelf = { id: "s-a", business_id: BUSINESS_A };
    shelves.findById.mockResolvedValue(shelf as never);
    biz.isMember.mockResolvedValue(true);
    biz.findByUserId.mockResolvedValue([membership("EMPLOYEE")]);

    await expect(ShelfService.remove("employee-user", "s-a")).rejects.toThrow();
    expect(shelves.softDelete).not.toHaveBeenCalled();
  });
});
