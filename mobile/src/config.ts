/**
 * Public URL of the Express backend. The backend is the only service the app
 * talks to; it owns access to RDS and the private AI service.
 *
 * Expo replaces EXPO_PUBLIC_API_URL while bundling. Production must never fall
 * back to localhost because localhost on a phone means the phone itself.
 */
const LOCAL_API_URL = 'http://localhost:5000';
const DEPLOYED_API_URL = 'https://snapstock.rashmika.dev/snapstock-backend-http';

function resolveApiUrl(value: string | undefined): string {
  const url = (value?.trim() || (__DEV__ ? LOCAL_API_URL : DEPLOYED_API_URL)).replace(/\/+$/, '');

  if (!/^https?:\/\//i.test(url)) {
    throw new Error('EXPO_PUBLIC_API_URL must be an absolute http(s) URL.');
  }

  return url;
}

export const API_URL = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL);
