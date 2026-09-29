/**
 * Business onboarding and invitation acceptance, end to end in the browser: the real
 * AuthProvider, ProtectedRoute, CreateBusiness and AcceptInvitation pages and the api
 * helper all run; only the network (fetch) is replaced by a fake backend.
 * The route tree mirrors App.tsx, with a stand-in dashboard page.
 * SRS: FR-TENANT-001/002 (onboarding, invitations), NFR-SEC-003 (access control), NFR-USE-005.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter, Route, Routes } from "react-router";

import { AuthProvider } from "../../src/context/AuthContext";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import CreateBusiness from "../../src/pages/CreateBusiness";
import AcceptInvitation from "../../src/pages/AcceptInvitation";
import type { AuthUser } from "../../src/lib/auth";

vi.mock("@/components/ThemeToggle", () => ({ default: () => null }));
vi.mock("@/components/Logo", () => ({ default: () => <span>SnapStock</span> }));

type FakeResponse = { status?: number; body: unknown };
type Handler = (init: RequestInit) => FakeResponse;


let routes: Record<string, Handler>;
const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = new URL(String(input));
  const key = `${init.method ?? "GET"} ${url.pathname}`;
  const handler = routes[key];
  if (!handler) throw new Error(`Unexpected request: ${key}`);
  const { status = 200, body } = handler(init);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
});

function requestsTo(key: string) {
  return fetchMock.mock.calls
    .filter(([input, init]) => `${init?.method ?? "GET"} ${new URL(String(input)).pathname}` === key)
    .map(([, init]) => ({
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    }));
}

const NEW_USER: AuthUser = {
  id: "user-1",
  full_name: "Nimal Perera",
  email: "nimal@example.com",
  system_role: "USER",
  businessId: null,
  businessRole: null,
};

function signIn(user: AuthUser, token = "token-before") {
  localStorage.setItem("snapstock_token", token);
  localStorage.setItem("snapstock_refresh", "refresh-before");
  localStorage.setItem("snapstock_user", JSON.stringify(user));
}

const storedUser = () => JSON.parse(localStorage.getItem("snapstock_user") ?? "null") as AuthUser | null;

function renderApp(path: string) {
  // AcceptInvitation reads the token from window.location, not from the router.
  window.history.pushState({}, "", path);
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<h1>Login page</h1>} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding/business" element={<CreateBusiness />} />
            <Route path="/dashboard" element={<h1>Dashboard page</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

async function fillBusinessForm() {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Business name"), "Fresh Mart");
  await user.type(screen.getByLabelText("Business email"), "hello@freshmart.com");
  await user.type(screen.getByLabelText("Business address"), "123 Main Street, Colombo");
  await user.type(screen.getByLabelText("Contact number"), "+94 77 123 4567");
  await user.click(screen.getByRole("button", { name: /create business and continue/i }));
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  routes = {
    "GET /businesses/mine": () => ({ body: { success: true, data: [] } }),
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.pushState({}, "", "/");
});

describe("onboarding a new business", () => {
  it("sends a user without a business to onboarding, creates it and opens the dashboard", async () => {
    signIn(NEW_USER);
    routes["POST /businesses"] = () => ({
      status: 201,
      body: {
        success: true,
        data: {
          business: { id: "biz-1", business_name: "Fresh Mart", role: "OWNER" },
          token: "token-after",
          refreshToken: "refresh-after",
          user: { ...NEW_USER, businessId: "biz-1", businessRole: "OWNER" },
        },
      },
    });
    renderApp("/dashboard");

    expect(await screen.findByLabelText("Business name")).toBeInTheDocument();
    await fillBusinessForm();

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
    const [created] = requestsTo("POST /businesses");
    expect(created.headers.Authorization).toBe("Bearer token-before");
    expect(created.body).toEqual({
      business_name: "Fresh Mart",
      business_email: "hello@freshmart.com",
      address: "123 Main Street, Colombo",
      contact_number: "+94 77 123 4567",
    });
    expect(localStorage.getItem("snapstock_token")).toBe("token-after");
    expect(localStorage.getItem("snapstock_refresh")).toBe("refresh-after");
    expect(storedUser()).toMatchObject({ businessId: "biz-1", businessRole: "OWNER" });
  });

  it("shows the server's error and keeps the user on onboarding when creation fails", async () => {
    signIn(NEW_USER);
    routes["POST /businesses"] = () => ({ status: 400, body: { success: false, message: "Invalid email address" } });
    renderApp("/onboarding/business");

    await fillBusinessForm();

    expect(await screen.findByText("Invalid email address")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard page")).not.toBeInTheDocument();
    expect(localStorage.getItem("snapstock_token")).toBe("token-before");
    expect(storedUser()?.businessId).toBeNull();
  });

  it("lets a user whose membership already exists on the server straight into the dashboard", async () => {
    signIn(NEW_USER);
    routes["GET /businesses/mine"] = () => ({
      body: { success: true, data: [{ id: "biz-1", business_name: "Fresh Mart", role: "OWNER" }] },
    });
    routes["POST /businesses/switch"] = () => ({
      body: {
        success: true,
        data: { token: "token-switched", refreshToken: "refresh-switched", user: { ...NEW_USER, businessId: "biz-1", businessRole: "OWNER" } },
      },
    });
    renderApp("/dashboard");

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
    expect(requestsTo("POST /businesses/switch")[0].body).toEqual({ businessId: "biz-1" });
    expect(localStorage.getItem("snapstock_token")).toBe("token-switched");
  });
});

describe("access control", () => {
  it("sends a signed-out visitor to login without calling the API", async () => {
    renderApp("/dashboard");

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signs the user out when their session has expired and cannot be refreshed", async () => {
    signIn({ ...NEW_USER, businessId: "biz-1", businessRole: "OWNER" });
    routes["GET /businesses/mine"] = () => ({ status: 401, body: { success: false, message: "Session expired or revoked" } });
    routes["POST /auth/refresh"] = () => ({ status: 401, body: { success: false, message: "Invalid refresh token" } });
    renderApp("/dashboard");

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(localStorage.getItem("snapstock_token")).toBeNull();
    expect(storedUser()).toBeNull();
  });
});

describe("accepting an employee invitation", () => {
  it("joins the business as an employee and opens the dashboard", async () => {
    signIn(NEW_USER);
    routes["POST /businesses/invitations/accept"] = () => ({
      body: {
        success: true,
        message: "Invitation accepted successfully.",
        data: {
          token: "token-employee",
          refreshToken: "refresh-employee",
          user: { ...NEW_USER, businessId: "biz-9", businessRole: "EMPLOYEE" },
        },
      },
    });
    routes["GET /businesses/mine"] = () => ({
      body: { success: true, data: [{ id: "biz-9", business_name: "Green Grocers", role: "EMPLOYEE" }] },
    });
    renderApp("/accept-invitation?token=invite-abc");

    expect(await screen.findByText("Invitation accepted")).toBeInTheDocument();
    const [accepted] = requestsTo("POST /businesses/invitations/accept");
    expect(accepted.headers.Authorization).toBe("Bearer token-before");
    expect(accepted.body).toEqual({ token: "invite-abc" });
    expect(localStorage.getItem("snapstock_token")).toBe("token-employee");
    expect(storedUser()).toMatchObject({ businessId: "biz-9", businessRole: "EMPLOYEE" });

    await userEvent.click(screen.getByRole("button", { name: /open dashboard/i }));
    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
    expect(screen.queryByLabelText("Business name")).not.toBeInTheDocument();
  });

  it("shows why an invitation was refused and keeps the current session", async () => {
    signIn(NEW_USER);
    routes["POST /businesses/invitations/accept"] = () => ({
      status: 400,
      body: { success: false, message: "Sign in with the email address that received this invitation." },
    });
    renderApp("/accept-invitation?token=invite-abc");

    expect(await screen.findByText("Sign in with the email address that received this invitation.")).toBeInTheDocument();
    expect(localStorage.getItem("snapstock_token")).toBe("token-before");
    expect(storedUser()?.businessId).toBeNull();
  });

  it("asks a signed-out visitor to sign in first and does not call the API", async () => {
    renderApp("/accept-invitation?token=invite-abc");

    expect(await screen.findByText("Sign in to accept your invitation")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
