import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "../../src/lib/api";
import { clearAuth, getStoredUser, getToken, setAuth } from "../../src/lib/auth";

// FR-AUTH-006 (session enforcement, client side) and NFR-USE-005 (user-friendly error feedback).

const user = {
  id: "u1",
  full_name: "Test User",
  email: "t@example.com",
  system_role: "BUSINESS_USER",
  businessId: "b1",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("sends the bearer token only for authenticated calls", async () => {
    setAuth("access-1", user, "refresh-1");
    fetchMock.mockResolvedValue(json(200, { success: true, data: {} }));

    await apiRequest("/public");
    await apiRequest("/private", {}, true);

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer access-1");
  });

  it("surfaces the server's message on failure so the UI can show it", async () => {
    fetchMock.mockResolvedValue(json(400, { success: false, message: "Invalid credentials" }));

    await expect(apiRequest("/auth/login", { method: "POST" })).rejects.toThrow("Invalid credentials");
  });

  it("falls back to a generic message when the error body is not JSON (never a raw parse error)", async () => {
    fetchMock.mockResolvedValue(new Response("<html>502 Bad Gateway</html>", { status: 502 }));

    await expect(apiRequest("/anything")).rejects.toThrow("Request failed");
  });

  it("on 401 refreshes the session once and replays the original request with the new token", async () => {
    setAuth("expired", user, "refresh-1");
    fetchMock
      .mockResolvedValueOnce(json(401, { success: false, message: "Invalid or expired token" }))
      .mockResolvedValueOnce(
        json(200, { success: true, data: { token: "fresh", refreshToken: "refresh-2", user } }),
      )
      .mockResolvedValueOnce(json(200, { success: true, data: { ok: true } }));

    const result = await apiRequest("/shelves", {}, true);

    expect(result.data).toEqual({ ok: true });
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/auth\/refresh$/);
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe("Bearer fresh");
    expect(getToken()).toBe("fresh");
  });

  it("when the refresh token is rejected, clears the stored session and reports the failure", async () => {
    setAuth("expired", user, "revoked");
    fetchMock
      .mockResolvedValueOnce(json(401, { success: false, message: "Invalid or expired token" }))
      .mockResolvedValueOnce(json(400, { success: false, message: "Invalid or expired refresh token" }));

    await expect(apiRequest("/shelves", {}, true)).rejects.toThrow("Invalid or expired token");

    expect(getToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it("does not loop: a second 401 after a successful refresh is returned as an error", async () => {
    setAuth("expired", user, "refresh-1");
    fetchMock
      .mockResolvedValueOnce(json(401, { success: false, message: "denied" }))
      .mockResolvedValueOnce(json(200, { success: true, data: { token: "fresh", refreshToken: "r2", user } }))
      .mockResolvedValueOnce(json(401, { success: false, message: "denied" }));

    await expect(apiRequest("/shelves", {}, true)).rejects.toThrow("denied");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not try to refresh when the caller has no refresh token", async () => {
    setAuth("expired", user);
    fetchMock.mockResolvedValueOnce(json(401, { success: false, message: "No token" }));

    await expect(apiRequest("/shelves", {}, true)).rejects.toThrow("No token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("stored session", () => {
  it("survives corrupt stored user JSON without throwing", () => {
    localStorage.setItem("snapstock_user", "{not json");

    expect(getStoredUser()).toBeNull();
  });

  it("clearAuth removes token, refresh token and user", () => {
    setAuth("a", user, "r");
    clearAuth();

    expect(getToken()).toBeNull();
    expect(localStorage.getItem("snapstock_refresh")).toBeNull();
    expect(getStoredUser()).toBeNull();
  });
});
