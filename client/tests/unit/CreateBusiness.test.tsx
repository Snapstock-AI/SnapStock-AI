/**
 * CreateBusiness: the onboarding step where a signed-in user creates their business.
 * SRS: FR-TENANT-001 (onboarding), NFR-USE-005 (understandable errors).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter, Route, Routes } from "react-router";

import CreateBusiness from "../../src/pages/CreateBusiness";

const createBusiness = vi.fn();
const logout = vi.fn();
let currentUser: { full_name?: string } | null = { full_name: "Nimal Perera" };

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: currentUser, createBusiness, logout }),
}));
vi.mock("@/components/ThemeToggle", () => ({ default: () => null }));
vi.mock("@/components/Logo", () => ({ default: () => <span>SnapStock</span> }));

const VALID = {
  business_name: "Fresh Mart",
  business_email: "hello@freshmart.com",
  address: "123 Main Street, Colombo",
  contact_number: "+94 77 123 4567",
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/create-business"]}>
      <Routes>
        <Route path="/create-business" element={<CreateBusiness />} />
        <Route path="/dashboard" element={<h1>Dashboard page</h1>} />
        <Route path="/login" element={<h1>Login page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillForm(values: Partial<typeof VALID> = VALID) {
  const user = userEvent.setup();
  if (values.business_name) await user.type(screen.getByLabelText("Business name"), values.business_name);
  if (values.business_email) await user.type(screen.getByLabelText("Business email"), values.business_email);
  if (values.address) await user.type(screen.getByLabelText("Business address"), values.address);
  if (values.contact_number) await user.type(screen.getByLabelText("Contact number"), values.contact_number);
  return user;
}

const submitButton = () => screen.getByRole("button", { name: /create business and continue/i });

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = { full_name: "Nimal Perera" };
  createBusiness.mockResolvedValue(undefined);
  logout.mockResolvedValue(undefined);
});

describe("CreateBusiness page", () => {
  it("greets the user by first name and shows the four business fields", () => {
    renderPage();

    expect(screen.getByText("Welcome, Nimal.")).toBeInTheDocument();
    for (const label of ["Business name", "Business email", "Business address", "Contact number"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("falls back to a generic greeting when the user's name is unknown", () => {
    currentUser = null;
    renderPage();

    expect(screen.getByText("Welcome, there.")).toBeInTheDocument();
  });

  it("marks every field as required and limits name and phone length, matching the server's rules", () => {
    renderPage();

    for (const label of ["Business name", "Business email", "Business address", "Contact number"]) {
      expect(screen.getByLabelText(label)).toBeRequired();
    }
    expect(screen.getByLabelText("Business email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Business name")).toHaveAttribute("maxLength", "150");
    expect(screen.getByLabelText("Contact number")).toHaveAttribute("maxLength", "20");
  });

  it("does not submit an incomplete form", async () => {
    renderPage();
    const user = await fillForm({ business_name: "Fresh Mart" });

    await user.click(submitButton());

    expect(createBusiness).not.toHaveBeenCalled();
  });

  it("creates the business with exactly what was entered and opens the dashboard", async () => {
    renderPage();
    const user = await fillForm();

    await user.click(submitButton());

    await waitFor(() => expect(createBusiness).toHaveBeenCalledWith(VALID));
    expect(await screen.findByRole("heading", { name: "Dashboard page" })).toBeInTheDocument();
  });

  it("shows progress and prevents a double submit while the business is being created", async () => {
    let finish!: () => void;
    createBusiness.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    renderPage();
    const user = await fillForm();

    await user.click(submitButton());

    const busy = screen.getByRole("button", { name: /creating workspace/i });
    expect(busy).toBeDisabled();
    fireEvent.click(busy);
    expect(createBusiness).toHaveBeenCalledTimes(1);

    finish();
    expect(await screen.findByRole("heading", { name: "Dashboard page" })).toBeInTheDocument();
  });

  it("shows the server's message, stays on the page and allows another try", async () => {
    createBusiness.mockRejectedValueOnce(new Error("Invalid email"));
    renderPage();
    const user = await fillForm();

    await user.click(submitButton());

    expect(await screen.findByText("Invalid email")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Dashboard page" })).not.toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
    expect(screen.getByLabelText("Business name")).toHaveValue("Fresh Mart");

    await user.click(submitButton());
    expect(await screen.findByRole("heading", { name: "Dashboard page" })).toBeInTheDocument();
  });

  it("uses a friendly default message when the error has none", async () => {
    createBusiness.mockRejectedValue(new Error(""));
    renderPage();
    const user = await fillForm();

    await user.click(submitButton());

    expect(await screen.findByText("We could not create your business.")).toBeInTheDocument();
  });

  it("signs the user out and returns to the login page", async () => {
    renderPage();

    await userEvent.setup().click(screen.getByRole("button", { name: "Sign out" }));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("heading", { name: "Login page" })).toBeInTheDocument();
  });
});
