import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";

import ProtectedRoute from "../../src/components/ProtectedRoute";

// FR-AUTH-006 / FR-TENANT-003: unauthenticated users never reach tenant pages.

const auth = vi.hoisted(() => ({
  value: {
    isAuthenticated: false,
    user: null as { businessId: string | null } | null,
    syncBusinessMembership: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../../src/context/AuthContext", () => ({
  useAuth: () => auth.value,
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding/business" element={<div>onboarding page</div>} />
          <Route path="/dashboard" element={<div>dashboard page</div>} />
          <Route path="/dashboard/shelves" element={<div>shelves page</div>} />
          <Route path="/dashboard/settings" element={<div>settings page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function signedIn(businessId: string | null) {
  auth.value = { ...auth.value, isAuthenticated: true, user: { businessId } };
}

describe("ProtectedRoute", () => {
  it("redirects an unauthenticated visitor to the login page", async () => {
    auth.value = { ...auth.value, isAuthenticated: false, user: null };

    renderAt("/dashboard");

    expect(await screen.findByText("login page")).toBeInTheDocument();
    expect(screen.queryByText("dashboard page")).not.toBeInTheDocument();
  });

  it("does not ask the server about business membership for a visitor who is not signed in", () => {
    auth.value = { ...auth.value, isAuthenticated: false, user: null };
    auth.value.syncBusinessMembership.mockClear();

    renderAt("/dashboard/shelves");

    expect(auth.value.syncBusinessMembership).not.toHaveBeenCalled();
  });

  it("sends a signed-in user without a business to onboarding for pages that need one", async () => {
    signedIn(null);

    renderAt("/dashboard/shelves");

    expect(await screen.findByText("onboarding page")).toBeInTheDocument();
  });

  it("keeps settings reachable for a user without a business", async () => {
    signedIn(null);

    renderAt("/dashboard/settings");

    expect(await screen.findByText("settings page")).toBeInTheDocument();
  });

  it("lets the dashboard workspace render for a user without a business (empty workspace state)", async () => {
    signedIn(null);

    renderAt("/dashboard");

    expect(await screen.findByText("dashboard page")).toBeInTheDocument();
  });

  it("redirects a user who already has a business away from onboarding", async () => {
    signedIn("b1");

    renderAt("/onboarding/business");

    expect(await screen.findByText("dashboard page")).toBeInTheDocument();
  });

  it("renders the requested page for a member of a business", async () => {
    signedIn("b1");

    renderAt("/dashboard/shelves");

    expect(await screen.findByText("shelves page")).toBeInTheDocument();
  });
});
