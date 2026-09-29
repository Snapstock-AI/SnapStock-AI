/**
 * AcceptInvitation: where an invited employee joins a business from the email link.
 * SRS: FR-TENANT-002 (invite employee), FR-TENANT-003 / NFR-SEC-003 (only the invited,
 * signed-in user can join), NFR-USE-005 (understandable errors).
 */
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter, Route, Routes } from "react-router";

import AcceptInvitation from "../../src/pages/AcceptInvitation";

const acceptInvitation = vi.fn();
let isAuthenticated = true;

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ acceptInvitation, isAuthenticated }),
}));

/** The page reads the token from window.location, so set the real URL too. */
function openInvitationLink(search: string, { strict = false } = {}) {
  window.history.replaceState({}, "", `/accept-invitation${search}`);
  const page = (
    <MemoryRouter initialEntries={[`/accept-invitation${search}`]}>
      <Routes>
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
        <Route path="/dashboard" element={<h1>Dashboard page</h1>} />
      </Routes>
    </MemoryRouter>
  );
  return render(strict ? <StrictMode>{page}</StrictMode> : page);
}

beforeEach(() => {
  vi.clearAllMocks();
  isAuthenticated = true;
  acceptInvitation.mockResolvedValue(undefined);
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("a link without a token", () => {
  it("explains the link is invalid, offers sign in and accepts nothing", () => {
    openInvitationLink("");

    expect(screen.getByRole("heading", { name: "Invalid invitation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute("href", "/login");
    expect(acceptInvitation).not.toHaveBeenCalled();
  });

  it("treats an empty token the same way", () => {
    openInvitationLink("?token=");

    expect(screen.getByRole("heading", { name: "Invalid invitation" })).toBeInTheDocument();
  });
});

describe("a visitor who is not signed in", () => {
  beforeEach(() => {
    isAuthenticated = false;
  });

  it("asks them to sign in first and does not accept the invitation", () => {
    openInvitationLink("?token=abc123");

    expect(
      screen.getByRole("heading", { name: "Sign in to accept your invitation" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Use the email address that received this invitation/)).toBeInTheDocument();
    expect(acceptInvitation).not.toHaveBeenCalled();
  });

  it("sign in and create-account links bring them back to this invitation", () => {
    openInvitationLink("?token=abc123");
    const back = encodeURIComponent("/accept-invitation?token=abc123");

    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", `/login?from=${back}`);
    expect(screen.getByRole("link", { name: /create account/i })).toHaveAttribute("href", `/signup?from=${back}`);
  });

  it("keeps a token with special characters intact in the return link", () => {
    openInvitationLink(`?token=${encodeURIComponent("a+b/c=")}`);
    const back = encodeURIComponent(`/accept-invitation?token=${encodeURIComponent("a+b/c=")}`);

    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", `/login?from=${back}`);
  });
});

describe("a signed-in user", () => {
  it("accepts the invitation with the token from the link and confirms it", async () => {
    openInvitationLink("?token=abc123");

    expect(await screen.findByRole("heading", { name: "Invitation accepted" })).toBeInTheDocument();
    expect(acceptInvitation).toHaveBeenCalledWith("abc123");
    expect(screen.getByText("You are now part of the business team.")).toBeInTheDocument();
  });

  it("shows progress while the invitation is being accepted", async () => {
    let finish!: () => void;
    acceptInvitation.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    openInvitationLink("?token=abc123");

    expect(await screen.findByText("Adding you to the business team...")).toBeInTheDocument();

    finish();
    expect(await screen.findByRole("heading", { name: "Invitation accepted" })).toBeInTheDocument();
  });

  it("opens the dashboard of the new business after accepting", async () => {
    openInvitationLink("?token=abc123");

    await userEvent.setup().click(await screen.findByRole("button", { name: /open dashboard/i }));

    expect(await screen.findByRole("heading", { name: "Dashboard page" })).toBeInTheDocument();
  });

  it("sends the single-use token only once, even when React runs effects twice (StrictMode)", async () => {
    openInvitationLink("?token=abc123", { strict: true });

    expect(await screen.findByRole("heading", { name: "Invitation accepted" })).toBeInTheDocument();
    expect(acceptInvitation).toHaveBeenCalledTimes(1);
  });

  it.each([
    "Sign in with the email address that received this invitation.",
    "This invitation has expired.",
    "This invitation is invalid or has already been used.",
  ])("shows the reason when it cannot be accepted: %s", async (message) => {
    acceptInvitation.mockRejectedValue(new Error(message));
    openInvitationLink("?token=abc123");

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Invitation accepted" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("uses a friendly default message for an unexpected failure", async () => {
    acceptInvitation.mockRejectedValue("network down");
    openInvitationLink("?token=abc123");

    expect(await screen.findByText("Unable to accept invitation.")).toBeInTheDocument();
  });

  it("does not retry automatically after a failure", async () => {
    acceptInvitation.mockRejectedValue(new Error("This invitation has expired."));
    openInvitationLink("?token=abc123");

    await screen.findByText("This invitation has expired.");
    await waitFor(() => expect(acceptInvitation).toHaveBeenCalledTimes(1));
  });
});
