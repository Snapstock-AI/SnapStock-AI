# SnapStock mobile app

The installed app calls the deployed Express API at:

`http://13.201.24.199/snapstock-backend-http`

The Express service connects to AWS RDS PostgreSQL and calls the deployed AI
service. Database credentials and the AI service URL stay on the server; they
must never be added to the app or an `EXPO_PUBLIC_` variable.

## Installable Android APK

The `apk` EAS profile produces a signed, standalone APK with its JavaScript
bundle embedded. It does not need Expo Go, `npx expo start`, or a computer after
installation. The deployed backend, AI service, and RDS instance must already
be running and reachable.

```bash
cd mobile
npm run typecheck
npm run build:android:apk
```

Log in to an Expo account when EAS asks on the first build. When the build
finishes, download the APK from the URL printed by EAS and install it on the
Android device. Use `npm run build:android:store` later to create an AAB for
Google Play instead of a directly installable APK.

## Local development

Copy `.env.example` to `.env.local` and replace `EXPO_PUBLIC_API_URL` with the
local backend URL. Common values are `http://10.0.2.2:5000` for the Android
emulator and `http://<computer-lan-ip>:5000` for a physical device.

The production server currently uses HTTP, so the Android build temporarily
permits cleartext traffic. Move the server to HTTPS and remove
`usesCleartextTraffic` from `app.json` before a public store release.
