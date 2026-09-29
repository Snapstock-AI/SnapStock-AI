/**
 * Client helpers for the owner's team management (invitations and employees).
 * SRS: FR-TENANT-002 (invite employee), FR-TENANT-003 (owner-only actions).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "../../src/lib/api";
import {
  listEmployeeInvitations,
  listEmployees,
  removeEmployee,
  sendEmployeeInvitation,
} from "../../src/lib/invitation";

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }));

const api = vi.mocked(apiRequest);

beforeEach(() => {
  api.mockReset();
});

describe("sendEmployeeInvitation", () => {
  it("POSTs the email and name to the business's invitations, authenticated", async () => {
    const invitation = { id: "invite-1", email: "emp@example.com", status: "PENDING" };
    api.mockResolvedValue({ success: true, data: invitation });

    const result = await sendEmployeeInvitation("biz-1", { email: "emp@example.com", full_name: "Emp One" });

    expect(api).toHaveBeenCalledWith(
      "/businesses/biz-1/invitations",
      { method: "POST", body: JSON.stringify({ email: "emp@example.com", full_name: "Emp One" }) },
      true,
    );
    expect(result).toEqual(invitation);
  });

  it("fails clearly when the server returns no invitation", async () => {
    api.mockResolvedValue({ success: true });

    await expect(sendEmployeeInvitation("biz-1", { email: "emp@example.com" })).rejects.toThrow(
      "Invitation was not created.",
    );
  });

  it("passes on the server's error, e.g. a non-owner inviting", async () => {
    api.mockRejectedValue(new Error("Only the business owner can invite employees."));

    await expect(sendEmployeeInvitation("biz-1", { email: "emp@example.com" })).rejects.toThrow(
      "Only the business owner can invite employees.",
    );
  });
});

describe("listEmployeeInvitations", () => {
  it("GETs the business's invitations, authenticated", async () => {
    api.mockResolvedValue({ success: true, data: [{ id: "invite-1" }] });

    await expect(listEmployeeInvitations("biz-1")).resolves.toEqual([{ id: "invite-1" }]);
    expect(api).toHaveBeenCalledWith("/businesses/biz-1/invitations", {}, true);
  });

  it("returns an empty list when there is no data", async () => {
    api.mockResolvedValue({ success: true });

    await expect(listEmployeeInvitations("biz-1")).resolves.toEqual([]);
  });
});

describe("listEmployees", () => {
  it("GETs the business's employees, authenticated", async () => {
    api.mockResolvedValue({ success: true, data: [{ user_id: "emp-1" }] });

    await expect(listEmployees("biz-1")).resolves.toEqual([{ user_id: "emp-1" }]);
    expect(api).toHaveBeenCalledWith("/businesses/biz-1/employees", {}, true);
  });

  it("returns an empty list when there is no data", async () => {
    api.mockResolvedValue({ success: true });

    await expect(listEmployees("biz-1")).resolves.toEqual([]);
  });
});

describe("removeEmployee", () => {
  it("DELETEs the employee from the business, authenticated", async () => {
    api.mockResolvedValue({ success: true });

    await removeEmployee("biz-1", "emp-1");

    expect(api).toHaveBeenCalledWith("/businesses/biz-1/employees/emp-1", { method: "DELETE" }, true);
  });

  it("passes on the server's error", async () => {
    api.mockRejectedValue(new Error("Employee not found in this business."));

    await expect(removeEmployee("biz-1", "owner-1")).rejects.toThrow("Employee not found in this business.");
  });
});
