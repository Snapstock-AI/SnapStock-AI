/**
 * Business onboarding, workspace switching, invitations and owner-only rules, end to end
 * through the backend: HTTP -> JWT auth middleware -> controllers -> BusinessService /
 * InvitationService / AuthService (session rotation and token signing).
 * Only the database is faked, as a small in-memory store behind the repositories, so a
 * token issued by one request is checked by the auth middleware on the next.
 * SRS: FR-TENANT-001/002/003, NFR-SEC-003 (tenant isolation), NFR-SEC-004 (input validation).
 */
import jwt from "jsonwebtoken";
import request from "supertest";

import app from "../../../src/app";
import { AuthRepository } from "../../../src/modules/auth/auth.repository";
import { BusinessRepository } from "../../../src/modules/business/business.repository";
import { AppDataSource } from "../../../src/config/data-source";
import { EmployeeInvitation } from "../../../src/entities/EmployeeInvitation";
import { User } from "../../../src/entities/User";
import { BusinessUser } from "../../../src/entities/BusinessUser";


jest.mock("../../../src/config/db", () => ({ __esModule: true, default: { query: jest.fn() } }));
jest.mock("../../../src/shared/utils/email");
jest.mock("../../../src/config/data-source", () => ({
  AppDataSource: { transaction: jest.fn(), getRepository: jest.fn() },
}));
jest.mock("../../../src/modules/auth/auth.repository", () => ({
  AuthRepository: {
    findActiveSessionById: jest.fn(),
    findById: jest.fn(),
    revokeSession: jest.fn(),
    createSession: jest.fn(),
  },
}));
jest.mock("../../../src/modules/business/business.repository", () => ({
  BusinessRepository: {
    findByUserId: jest.fn(),
    findBusinessMembershipByUserId: jest.fn(),
    findMembership: jest.fn(),
    isMember: jest.fn(),
    createWithOwner: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findEmployeesByBusinessId: jest.fn(),
    removeEmployee: jest.fn(),
  },
}));

const JWT_SECRET = "business-integration-secret";

const authRepo = AuthRepository as jest.Mocked<typeof AuthRepository>;
const businessRepo = BusinessRepository as jest.Mocked<typeof BusinessRepository>;
const dataSource = AppDataSource as jest.Mocked<typeof AppDataSource>;

type Role = "OWNER" | "EMPLOYEE";
type StoredUser = { id: string; email: string; full_name: string; system_role: string; email_verified: boolean; must_change_password: boolean };
type StoredBusiness = { id: string; business_name: string; business_email: string; address: string; contact_number: string; freshness_alert_threshold?: number; low_stock_threshold?: number };
type StoredMembership = { user_id: string; business_id: string; role: Role; joined_at?: Date };
type StoredSession = { id: string; user_id: string; expires_at: Date; revoked: boolean };
type StoredInvitation = { id: string; business_id: string; email: string; invitation_token: string; status: string; expires_at: Date; accepted_at?: Date };

// In-memory stand-in for the database tables the repositories read and write.
let db: {
  users: StoredUser[];
  businesses: StoredBusiness[];
  memberships: StoredMembership[];
  sessions: StoredSession[];
  invitations: StoredInvitation[];
};
let nextId = 0;

function user(id: string, email: string, full_name: string): StoredUser {
  return { id, email, full_name, system_role: "USER", email_verified: true, must_change_password: false };
}

function business(id: string, business_name: string): StoredBusiness {
  return { id, business_name, business_email: `hello@${id}.com`, address: "1 Main Street, Colombo", contact_number: "+94 77 000 0000" };
}

/** Signs a token for an existing session, the same way AuthService does at login. */
function loginAs(userId: string, businessId: string | null = null, role: Role | null = null) {
  const session: StoredSession = { id: `session-${++nextId}`, user_id: userId, expires_at: new Date(Date.now() + 3_600_000), revoked: false };
  db.sessions.push(session);
  const found = db.users.find((u) => u.id === userId)!;
  return jwt.sign(
    { userId, email: found.email, system_role: found.system_role, sessionId: session.id, businessId, businessRole: role },
    JWT_SECRET,
  );
}

const claims = (token: string) => jwt.verify(token, JWT_SECRET) as Record<string, any>;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

function wireRepositories() {
  authRepo.findActiveSessionById.mockImplementation(async (id) => {
    const session = db.sessions.find((s) => s.id === id && !s.revoked);
    return (session ?? null) as never;
  });
  authRepo.findById.mockImplementation(async (id) => (db.users.find((u) => u.id === id) ?? null) as never);
  authRepo.revokeSession.mockImplementation(async (id) => {
    db.sessions.find((s) => s.id === id)!.revoked = true;
  });
  authRepo.createSession.mockImplementation(async (userId, _refresh, expires_at) => {
    const session: StoredSession = { id: `session-${++nextId}`, user_id: userId, expires_at, revoked: false };
    db.sessions.push(session);
    return session as never;
  });

  const membershipOf = (userId: string, businessId: string) =>
    db.memberships.find((m) => m.user_id === userId && m.business_id === businessId) ?? null;

  businessRepo.findByUserId.mockImplementation(async (userId) =>
    db.memberships
      .filter((m) => m.user_id === userId)
      .map((m) => ({ ...m, business: db.businesses.find((b) => b.id === m.business_id) })) as never,
  );
  businessRepo.findBusinessMembershipByUserId.mockImplementation(async (userId) => {
    const first = db.memberships.find((m) => m.user_id === userId);
    return first ? { businessId: first.business_id, role: first.role } : null;
  });
  businessRepo.findMembership.mockImplementation(async (userId, businessId) => membershipOf(userId, businessId) as never);
  businessRepo.isMember.mockImplementation(async (userId, businessId) => Boolean(membershipOf(userId, businessId)));
  businessRepo.createWithOwner.mockImplementation(async (userId, data) => {
    const created = { id: `biz-created-${++nextId}`, ...data };
    db.businesses.push(created);
    db.memberships.push({ user_id: userId, business_id: created.id, role: "OWNER" });
    return created as never;
  });
  businessRepo.findById.mockImplementation(async (id) => ({ ...db.businesses.find((b) => b.id === id)! }) as never);
  businessRepo.update.mockImplementation(async (changed) => {
    const index = db.businesses.findIndex((b) => b.id === changed.id);
    db.businesses[index] = { ...(changed as unknown as StoredBusiness) };
    return changed;
  });
  businessRepo.delete.mockImplementation(async (id) => {
    const before = db.businesses.length;
    db.businesses = db.businesses.filter((b) => b.id !== id);
    return { affected: before - db.businesses.length, raw: [] };
  });
  businessRepo.findEmployeesByBusinessId.mockImplementation(async (businessId) =>
    db.memberships
      .filter((m) => m.business_id === businessId && m.role === "EMPLOYEE")
      .map((m) => {
        const u = db.users.find((x) => x.id === m.user_id)!;
        return { user_id: m.user_id, role: m.role, full_name: u.full_name, email: u.email };
      }),
  );
  businessRepo.removeEmployee.mockImplementation(async (userId, businessId) => {
    db.memberships = db.memberships.filter((m) => !(m.user_id === userId && m.business_id === businessId && m.role === "EMPLOYEE"));
    return { affected: 1, raw: [] };
  });

  // InvitationService.accept runs inside a transaction and uses the entity manager directly.
  const manager = {
    findOne: jest.fn(async (entity: unknown, { where }: { where: Record<string, string> }) => {
      if (entity === EmployeeInvitation) return db.invitations.find((i) => i.invitation_token === where.invitation_token) ?? null;
      if (entity === User) return db.users.find((u) => u.id === where.id) ?? null;
      if (entity === BusinessUser) return membershipOf(where.user_id, where.business_id);
      return null;
    }),
    create: jest.fn((_entity: unknown, data: object) => ({ ...data })),
    save: jest.fn(async (row: StoredMembership | object) => {
      if ("role" in row && "business_id" in row && !membershipOf(row.user_id, row.business_id)) {
        db.memberships.push(row);
      }
      return row;
    }),
  };
  dataSource.transaction.mockImplementation((async (work: (m: typeof manager) => unknown) => work(manager)) as never);
}

const NEW_BUSINESS = {
  business_name: "  Fresh Mart  ",
  business_email: "hello@freshmart.com",
  address: "123 Main Street, Colombo",
  contact_number: "+94 77 123 4567",
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = JWT_SECRET;
  nextId = 0;
  db = {
    users: [
      user("user-new", "new@example.com", "New User"),
      user("user-owner", "owner@example.com", "Olivia Owner"),
      user("user-employee", "employee@example.com", "Evan Employee"),
      user("user-outsider", "outsider@example.com", "Oscar Outsider"),
    ],
    businesses: [business("biz-1", "Green Grocers"), business("biz-2", "Other Shop")],
    memberships: [
      { user_id: "user-owner", business_id: "biz-1", role: "OWNER" },
      { user_id: "user-employee", business_id: "biz-1", role: "EMPLOYEE" },
      { user_id: "user-outsider", business_id: "biz-2", role: "OWNER" },
    ],
    sessions: [],
    invitations: [],
  };
  wireRepositories();
});

describe("onboarding: a new user creates their business", () => {
  it("creates the business, makes the user its owner and issues a token for it", async () => {
    const token = loginAs("user-new");

    const response = await request(app).post("/businesses").set(auth(token)).send(NEW_BUSINESS);

    expect(response.status).toBe(201);
    const { business: created, token: newToken, user: newUser } = response.body.data;
    expect(created).toMatchObject({ business_name: "Fresh Mart", role: "OWNER" });
    expect(db.memberships).toContainEqual({ user_id: "user-new", business_id: created.id, role: "OWNER" });
    expect(claims(newToken)).toMatchObject({ userId: "user-new", businessId: created.id, businessRole: "OWNER" });
    expect(newUser).toMatchObject({ id: "user-new", businessId: created.id, businessRole: "OWNER" });
  });

  it("retires the old session, so the pre-business token stops working", async () => {
    const oldToken = loginAs("user-new");

    const created = await request(app).post("/businesses").set(auth(oldToken)).send(NEW_BUSINESS);
    const withOld = await request(app).get("/businesses/mine").set(auth(oldToken));
    const withNew = await request(app).get("/businesses/mine").set(auth(created.body.data.token));

    expect(withOld.status).toBe(401);
    expect(withOld.body.message).toBe("Session expired or revoked");
    expect(withNew.status).toBe(200);
    expect(withNew.body.data).toEqual([
      expect.objectContaining({ id: created.body.data.business.id, business_name: "Fresh Mart", role: "OWNER" }),
    ]);
  });

  it.each([
    ["an invalid email", { business_email: "not-an-email" }],
    ["a blank name", { business_name: "   " }],
    ["a phone number over 20 characters", { contact_number: "+94 77 123 4567 890 12" }],
  ])("rejects %s without creating anything", async (_case, change) => {
    const token = loginAs("user-new");

    const response = await request(app).post("/businesses").set(auth(token)).send({ ...NEW_BUSINESS, ...change });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(businessRepo.createWithOwner).not.toHaveBeenCalled();
    expect(authRepo.revokeSession).not.toHaveBeenCalled();
  });

  it("requires the user to be signed in", async () => {
    const response = await request(app).post("/businesses").send(NEW_BUSINESS);

    expect(response.status).toBe(401);
    expect(businessRepo.createWithOwner).not.toHaveBeenCalled();
  });
});

describe("workspaces: listing and switching", () => {
  it("lists only the businesses the user belongs to, with their role and default thresholds", async () => {
    const response = await request(app).get("/businesses/mine").set(auth(loginAs("user-employee", "biz-1", "EMPLOYEE")));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      expect.objectContaining({ id: "biz-1", role: "EMPLOYEE", freshness_alert_threshold: 65, low_stock_threshold: 25 }),
    ]);
  });

  it("switches to a business the user belongs to and issues a token for it", async () => {
    db.memberships.push({ user_id: "user-owner", business_id: "biz-2", role: "EMPLOYEE" });

    const response = await request(app)
      .post("/businesses/switch")
      .set(auth(loginAs("user-owner", "biz-1", "OWNER")))
      .send({ businessId: "biz-2" });

    expect(response.status).toBe(200);
    expect(claims(response.body.data.token)).toMatchObject({ businessId: "biz-2", businessRole: "EMPLOYEE" });
  });

  it("refuses to switch into someone else's business and keeps the current session", async () => {
    const token = loginAs("user-owner", "biz-1", "OWNER");

    const response = await request(app).post("/businesses/switch").set(auth(token)).send({ businessId: "biz-2" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("You do not belong to this business");
    expect(authRepo.revokeSession).not.toHaveBeenCalled();
    expect((await request(app).get("/businesses/mine").set(auth(token))).status).toBe(200);
  });
});

describe("owner-only actions", () => {
  const ownerToken = () => loginAs("user-owner", "biz-1", "OWNER");
  const employeeToken = () => loginAs("user-employee", "biz-1", "EMPLOYEE");
  const outsiderToken = () => loginAs("user-outsider", "biz-2", "OWNER");

  it("the owner can update business details and alert thresholds", async () => {
    const response = await request(app)
      .patch("/businesses/biz-1")
      .set(auth(ownerToken()))
      .send({ business_name: "Green Grocers Ltd", freshness_alert_threshold: 70 });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ business_name: "Green Grocers Ltd", freshness_alert_threshold: 70 });
    expect(db.businesses.find((b) => b.id === "biz-1")!.business_name).toBe("Green Grocers Ltd");
  });

  it.each([
    ["an employee", employeeToken],
    ["an owner of a different business", outsiderToken],
  ])("%s cannot update the business", async (_who, token) => {
    const response = await request(app).patch("/businesses/biz-1").set(auth(token())).send({ business_name: "Hacked" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Only the business owner can update business details.");
    expect(db.businesses.find((b) => b.id === "biz-1")!.business_name).toBe("Green Grocers");
  });

  it("rejects an out-of-range freshness threshold even from the owner", async () => {
    const response = await request(app).patch("/businesses/biz-1").set(auth(ownerToken())).send({ freshness_alert_threshold: 150 });

    expect(response.status).toBe(400);
    expect(businessRepo.update).not.toHaveBeenCalled();
  });

  it("an employee cannot delete the business", async () => {
    const response = await request(app).delete("/businesses/biz-1").set(auth(employeeToken()));

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Only the business owner can delete the business.");
    expect(db.businesses.map((b) => b.id)).toContain("biz-1");
  });

  it("the owner sees the team; an employee cannot", async () => {
    const asOwner = await request(app).get("/businesses/biz-1/employees").set(auth(ownerToken()));
    const asEmployee = await request(app).get("/businesses/biz-1/employees").set(auth(employeeToken()));

    expect(asOwner.status).toBe(200);
    expect(asOwner.body.data).toEqual([expect.objectContaining({ user_id: "user-employee", email: "employee@example.com" })]);
    expect(asEmployee.status).toBe(400);
    expect(asEmployee.body.message).toBe("Only the business owner can view employees.");
  });

  it("the owner can remove an employee but not another owner", async () => {
    db.memberships.push({ user_id: "user-outsider", business_id: "biz-1", role: "OWNER" });

    const removeEmployee = await request(app).delete("/businesses/biz-1/employees/user-employee").set(auth(ownerToken()));
    const removeOwner = await request(app).delete("/businesses/biz-1/employees/user-outsider").set(auth(ownerToken()));

    expect(removeEmployee.status).toBe(200);
    expect(db.memberships).not.toContainEqual(expect.objectContaining({ user_id: "user-employee", business_id: "biz-1" }));
    expect(removeOwner.status).toBe(400);
    expect(removeOwner.body.message).toBe("Employee not found in this business.");
    expect(db.memberships).toContainEqual(expect.objectContaining({ user_id: "user-outsider", business_id: "biz-1", role: "OWNER" }));
  });
});

describe("invitations: an invited user joins as an employee", () => {
  beforeEach(() => {
    db.invitations.push({
      id: "invite-1",
      business_id: "biz-1",
      email: "New@Example.com",
      invitation_token: "invite-token",
      status: "PENDING",
      expires_at: new Date(Date.now() + 86_400_000),
    });
  });

  const accept = (token: string, invitationToken = "invite-token") =>
    request(app).post("/businesses/invitations/accept").set(auth(token)).send({ token: invitationToken });

  it("adds the user as an EMPLOYEE and issues a token for that business", async () => {
    const response = await accept(loginAs("user-new"));

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Invitation accepted successfully.");
    expect(db.memberships).toContainEqual(expect.objectContaining({ user_id: "user-new", business_id: "biz-1", role: "EMPLOYEE" }));
    expect(db.invitations[0].status).toBe("ACCEPTED");
    expect(claims(response.body.data.token)).toMatchObject({ userId: "user-new", businessId: "biz-1", businessRole: "EMPLOYEE" });
  });

  it("the new employee can then use the business but not its owner-only areas", async () => {
    const accepted = await accept(loginAs("user-new"));
    const token = accepted.body.data.token;

    const mine = await request(app).get("/businesses/mine").set(auth(token));
    const team = await request(app).get("/businesses/biz-1/employees").set(auth(token));

    expect(mine.body.data).toEqual([expect.objectContaining({ id: "biz-1", role: "EMPLOYEE" })]);
    expect(team.status).toBe(400);
    expect(team.body.message).toBe("Only the business owner can view employees.");
  });

  it("refuses an invitation sent to a different email address", async () => {
    const response = await accept(loginAs("user-outsider", "biz-2", "OWNER"));

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Sign in with the email address that received this invitation.");
    expect(db.memberships).not.toContainEqual(expect.objectContaining({ user_id: "user-outsider", business_id: "biz-1" }));
    expect(authRepo.revokeSession).not.toHaveBeenCalled();
  });

  it("refuses an expired invitation and marks it EXPIRED", async () => {
    db.invitations[0].expires_at = new Date(Date.now() - 1000);

    const response = await accept(loginAs("user-new"));

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("This invitation has expired.");
    expect(db.invitations[0].status).toBe("EXPIRED");
    expect(db.memberships).not.toContainEqual(expect.objectContaining({ user_id: "user-new" }));
  });

  it("refuses an unknown invitation token", async () => {
    const response = await accept(loginAs("user-new"), "no-such-token");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invitation not found. Ask the owner to send a new invitation.");
  });
});
