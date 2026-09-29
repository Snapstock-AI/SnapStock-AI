/**
 * HTTP layer for business onboarding, workspace switching and invitations.
 * The real Express app, router and controllers run; services are mocked.
 * SRS: FR-TENANT-001/002/003, NFR-SEC-004 (input validation).
 */
import request from "supertest";

import app from "../../../src/app";
import { AuthService } from "../../../src/modules/auth/auth.service";
import { BusinessService } from "../../../src/modules/business/business.service";
import { InvitationService } from "../../../src/modules/business/invitation.service";

// Importing the app would otherwise open a real PostgreSQL pool (src/config/db.ts).
jest.mock("../../../src/config/db", () => ({ __esModule: true, default: { query: jest.fn() } }));

jest.mock("../../../src/shared/middleware/auth.middleware", () => ({
  authMiddleware: jest.fn((req, _res, next) => {
    req.user = { userId: "user-1", sessionId: "session-1" };
    next();
  }),
  requireRoles: () => jest.fn((_req, _res, next) => next()),
}));
jest.mock("../../../src/modules/business/business.service", () => ({
  BusinessService: {
    createForUser: jest.fn(),
    updateForOwner: jest.fn(),
    deleteForOwner: jest.fn(),
    listEmployees: jest.fn(),
    removeEmployee: jest.fn(),
    listForUser: jest.fn(),
    assertMember: jest.fn(),
    isMember: jest.fn(),
  },
}));
jest.mock("../../../src/modules/business/invitation.service", () => ({
  InvitationService: { accept: jest.fn(), list: jest.fn(), send: jest.fn() },
}));
jest.mock("../../../src/modules/auth/auth.service", () => ({
  AuthService: { rotateSession: jest.fn(), switchBusiness: jest.fn() },
}));

const businessService = BusinessService as jest.Mocked<typeof BusinessService>;
const invitationService = InvitationService as jest.Mocked<typeof InvitationService>;
const authService = AuthService as jest.Mocked<typeof AuthService>;

const VALID_BUSINESS = {
  business_name: "Fresh Mart",
  business_email: "shop@example.com",
  address: "1 Main St, Colombo",
  contact_number: "0771234567",
};
const SESSION = { token: "new-access-token", refreshToken: "new-refresh", user: { id: "user-1" } };

beforeEach(() => {
  jest.clearAllMocks();
  authService.rotateSession.mockResolvedValue(SESSION as never);
});

describe("POST /businesses (onboarding)", () => {
  it("creates the business and returns a session scoped to it (201)", async () => {
    businessService.createForUser.mockResolvedValue({ id: "biz-1", ...VALID_BUSINESS, role: "OWNER" });

    const res = await request(app).post("/businesses").send(VALID_BUSINESS);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, data: { business: { id: "biz-1", role: "OWNER" }, token: "new-access-token" } });
    expect(businessService.createForUser).toHaveBeenCalledWith("user-1", VALID_BUSINESS);
    expect(authService.rotateSession).toHaveBeenCalledWith("session-1", "biz-1");
  });

  it("trims the input before saving", async () => {
    businessService.createForUser.mockResolvedValue({ id: "biz-1", ...VALID_BUSINESS, role: "OWNER" });

    await request(app)
      .post("/businesses")
      .send({ ...VALID_BUSINESS, business_name: "  Fresh Mart  " });

    expect(businessService.createForUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ business_name: "Fresh Mart" }),
    );
  });

  it.each([
    ["no business name", { ...VALID_BUSINESS, business_name: "" }],
    ["an invalid email", { ...VALID_BUSINESS, business_email: "not-an-email" }],
    ["no address", { ...VALID_BUSINESS, address: "   " }],
    ["a contact number over 20 characters", { ...VALID_BUSINESS, contact_number: "0".repeat(21) }],
    ["a business name over 150 characters", { ...VALID_BUSINESS, business_name: "x".repeat(151) }],
    ["an empty body", {}],
  ])("rejects %s with 400 and creates nothing", async (_label, body) => {
    const res = await request(app).post("/businesses").send(body);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(typeof res.body.message).toBe("string");
    expect(businessService.createForUser).not.toHaveBeenCalled();
    expect(authService.rotateSession).not.toHaveBeenCalled();
  });
});

describe("PATCH /businesses/:businessId", () => {
  it.each([
    ["a freshness threshold above 100", { freshness_alert_threshold: 101 }],
    ["a negative low-stock threshold", { low_stock_threshold: -1 }],
    ["a non-integer threshold", { low_stock_threshold: 2.5 }],
    ["an invalid email", { business_email: "nope" }],
  ])("rejects %s with 400 without calling the service", async (_label, body) => {
    const res = await request(app).patch("/businesses/biz-1").send(body);

    expect(res.status).toBe(400);
    expect(businessService.updateForOwner).not.toHaveBeenCalled();
  });

  it("passes a valid partial update to the service for the caller and business in the URL", async () => {
    businessService.updateForOwner.mockResolvedValue({ id: "biz-1" } as never);

    const res = await request(app).patch("/businesses/biz-1").send({ low_stock_threshold: 10 });

    expect(res.status).toBe(200);
    expect(businessService.updateForOwner).toHaveBeenCalledWith("user-1", "biz-1", { low_stock_threshold: 10 });
  });
});

describe("POST /businesses/switch (workspace switching)", () => {
  it("requires a businessId", async () => {
    const res = await request(app).post("/businesses/switch").send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("businessId is required.");
    expect(authService.switchBusiness).not.toHaveBeenCalled();
  });

  it("switches the current session to the chosen business", async () => {
    authService.switchBusiness.mockResolvedValue(SESSION as never);

    const res = await request(app).post("/businesses/switch").send({ businessId: "biz-2" });

    expect(res.status).toBe(200);
    expect(authService.switchBusiness).toHaveBeenCalledWith("session-1", "biz-2");
  });

  it("returns the service's message when the user may not switch to that business", async () => {
    authService.switchBusiness.mockRejectedValue(new Error("You do not belong to this business"));

    const res = await request(app).post("/businesses/switch").send({ businessId: "biz-9" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("You do not belong to this business");
  });
});

describe("invitations", () => {
  it("POST /businesses/:businessId/invitations requires an email (400) and sends nothing", async () => {
    for (const body of [{}, { email: "" }, { email: "   " }, { email: 42 }]) {
      const res = await request(app).post("/businesses/biz-1/invitations").send(body);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Employee email is required.");
    }
    expect(invitationService.send).not.toHaveBeenCalled();
  });

  it("POST /businesses/:businessId/invitations sends the invitation (201)", async () => {
    invitationService.send.mockResolvedValue({ id: "invite-1", email: "emp@example.com", status: "PENDING" } as never);

    const res = await request(app)
      .post("/businesses/biz-1/invitations")
      .send({ email: "emp@example.com", full_name: "Emp One" });

    expect(res.status).toBe(201);
    expect(invitationService.send).toHaveBeenCalledWith("user-1", "biz-1", {
      email: "emp@example.com",
      full_name: "Emp One",
    });
  });

  it("ignores a full_name that is not a string", async () => {
    invitationService.send.mockResolvedValue({ id: "invite-1" } as never);

    await request(app).post("/businesses/biz-1/invitations").send({ email: "emp@example.com", full_name: { x: 1 } });

    expect(invitationService.send).toHaveBeenCalledWith("user-1", "biz-1", { email: "emp@example.com", full_name: undefined });
  });

  it("POST /businesses/invitations/accept joins the business and returns a session for it", async () => {
    invitationService.accept.mockResolvedValue({ businessId: "biz-2" });

    const res = await request(app).post("/businesses/invitations/accept").send({ token: "invite-token" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, message: "Invitation accepted successfully." });
    expect(invitationService.accept).toHaveBeenCalledWith("user-1", "invite-token");
    expect(authService.rotateSession).toHaveBeenCalledWith("session-1", "biz-2");
  });

  it("POST /businesses/invitations/accept returns the reason when the invitation cannot be used", async () => {
    invitationService.accept.mockRejectedValue(new Error("This invitation has expired."));

    const res = await request(app).post("/businesses/invitations/accept").send({ token: "old" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: "This invitation has expired." });
    expect(authService.rotateSession).not.toHaveBeenCalled();
  });

  it("GET /businesses/:businessId/invitations lists invitations for the business in the URL", async () => {
    invitationService.list.mockResolvedValue([]);

    const res = await request(app).get("/businesses/biz-1/invitations");

    expect(res.status).toBe(200);
    expect(invitationService.list).toHaveBeenCalledWith("user-1", "biz-1");
  });
});

describe("authorization status codes (FR-TENANT-003 A1)", () => {
  // Known defect on dev: owner-only refusals are answered with 400 instead of 403.
  // Fixed as BUG-09 on test/comprehensive-system-testing; remove `.failing` once that fix is merged.
  it.failing("a non-owner deleting the business receives 403 Forbidden", async () => {
    businessService.deleteForOwner.mockRejectedValue(
      new Error("Only the business owner can delete the business."),
    );

    const res = await request(app).delete("/businesses/biz-1");

    expect(res.status).toBe(403);
  });

  it("the refusal message is returned to the client and no internal detail is exposed", async () => {
    businessService.listEmployees.mockRejectedValue(new Error("Only the business owner can view employees."));

    const res = await request(app).get("/businesses/biz-1/employees");

    expect(res.body).toEqual({ success: false, message: "Only the business owner can view employees." });
    expect(res.text).not.toMatch(/stack|at \w+ \(/);
  });
});
