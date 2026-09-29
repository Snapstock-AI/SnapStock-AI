/**
 * ProtectedRoute: the gate in front of every signed-in page.
 * Sends signed-out users to login, waits for the business-membership check, and sends
 * users without a business to onboarding.
 * SRS: FR-TENANT-001 (onboarding), FR-TENANT-003 (roles), NFR-SEC-003 (access control).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router";

import ProtectedRoute from "../../src/components/ProtectedRoute";

type TestUser = {
  id: string;
  businessId: string | null;
  businessRole: "OWNER" | "EMPLOYEE" | null;
};

const syncBusinessMembership = vi.fn<() => Promise<boolean>>();
let isAuthenticated = true;
let currentUser: TestUser | null = null;

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated, user: currentUser, syncBusinessMembership }),
}));

function LoginPage() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  return <h1>Login page (from {from ?? "nowhere"})</h1>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding/business" element={<h1>Onboarding page</h1>} />
          <Route
            path="/dashboard"
            element={
              <>
                <h1>Dashboard page</h1>
                <Link to="/dashboard/scans">Go to scans</Link>
              </>
            }
          />
          <Route path="/dashboard/scans" element={<h1>Scans page</h1>} />
          <Route path="/dashboard/settings" element={<h1>Settings page</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  isAuthenticated = true;
  currentUser = { id: "user-1", businessId: "biz-1", businessRole: "OWNER" };
  syncBusinessMembership.mockResolvedValue(true);
});

describe("signed-out users", () => {
  it("are sent to login, remembering the page they asked for", () => {
    isAuthenticated = false;
    currentUser = null;
    renderAt("/dashboard/scans");

    expect(screen.getByText("Login page (from /dashboard/scans)")).toBeInTheDocument();
    expect(screen.queryByText("Scans page")).not.toBeInTheDocument();
    expect(syncBusinessMembership).not.toHaveBeenCalled();
  });

  it("cannot reach the onboarding page either", () => {
    isAuthenticated = false;
    currentUser = null;
    renderAt("/onboarding/business");

    expect(screen.getByText("Login page (from /onboarding/business)")).toBeInTheDocument();
  });
});

describe("business-membership check", () => {
  it("shows nothing until the membership check finishes", async () => {
    let finishSync: (value: boolean) => void = () => undefined;
    syncBusinessMembership.mockReturnValue(new Promise((resolve) => (finishSync = resolve)));
    renderAt("/dashboard");

    expect(screen.queryByText("Dashboard page")).not.toBeInTheDocument();
    expect(screen.queryByText("Onboarding page")).not.toBeInTheDocument();

    await act(async () => finishSync(true));
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("checks membership once per user, not on every page change", async () => {
    renderAt("/dashboard");
    fireEvent.click(await screen.findByRole("link", { name: "Go to scans" }));

    expect(await screen.findByText("Scans page")).toBeInTheDocument();
    expect(syncBusinessMembership).toHaveBeenCalledTimes(1);
  });

  it("still lets the user in when the membership check fails", async () => {
    syncBusinessMembership.mockRejectedValue(new Error("Network down"));
    renderAt("/dashboard");

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
  });
});

describe("users without a business", () => {
  beforeEach(() => {
    currentUser = { id: "user-2", businessId: null, businessRole: null };
    syncBusinessMembership.mockResolvedValue(false);
  });

  it("are sent to onboarding from any dashboard page", async () => {
    renderAt("/dashboard/scans");

    expect(await screen.findByText("Onboarding page")).toBeInTheDocument();
    expect(screen.queryByText("Scans page")).not.toBeInTheDocument();
  });

  it("can open the onboarding page without a membership check", () => {
    renderAt("/onboarding/business");

    expect(screen.getByText("Onboarding page")).toBeInTheDocument();
    expect(syncBusinessMembership).not.toHaveBeenCalled();
  });

  it("can still open settings", async () => {
    renderAt("/dashboard/settings");

    expect(await screen.findByText("Settings page")).toBeInTheDocument();
  });
});

describe("users with access", () => {
  it("owners with a business see the page they asked for", async () => {
    renderAt("/dashboard/scans");

    expect(await screen.findByText("Scans page")).toBeInTheDocument();
  });

  it("employees are never sent to onboarding, even before their business is known", async () => {
    currentUser = { id: "user-3", businessId: null, businessRole: "EMPLOYEE" };
    renderAt("/dashboard");

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
    expect(screen.queryByText("Onboarding page")).not.toBeInTheDocument();
  });
});
