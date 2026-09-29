/**
 * Base URL of the SnapStock-AI Express backend (see server/src/app.ts).
 *
 * Set EXPO_PUBLIC_API_URL in a local .env file to point at your backend:
 *  - Android emulator reaching a host machine dev server: http://10.0.2.2:5000
 *  - iOS simulator reaching a host machine dev server:    http://localhost:5000
 *  - Physical device on the same network:                 http://<your-lan-ip>:5000
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';
