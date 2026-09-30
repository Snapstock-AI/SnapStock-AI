/** Thrown when an authenticated caller is not allowed to touch a resource (wrong role or other tenant). */
export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

// FR-TENANT-003: wrong role / cross-tenant -> 403; everything else stays a 400 client error.
export const errorStatus = (error: unknown) =>
  error instanceof ForbiddenError ? 403 : 400;

const isDatabaseError = (error: any) =>
  error?.name === "QueryFailedError" ||
  (typeof error?.code === "string" && /^[0-9A-Z]{5}$/.test(error.code));

/** NFR-SEC-005: never echo driver/SQL internals to clients. */
export const errorMessage = (error: any, fallback = "The request could not be processed.") =>
  isDatabaseError(error) ? fallback : error?.message || fallback;
