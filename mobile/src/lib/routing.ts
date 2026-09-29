import type { AuthUser } from './auth';

/** Where to send an authenticated user right after login/hydration. */
export function getPostAuthRoute(user: AuthUser | null): '/vendors' | '/create-business' | '/home' {
  if (user?.system_role === 'SYSTEM_ADMIN') return '/vendors';
  if (!user?.businessId) return '/create-business';
  return '/home';
}
