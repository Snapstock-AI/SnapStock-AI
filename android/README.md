# SnapStock Android App (WebView)

Native-feeling Android shell around the production web app at
**https://snapstock.rashmika.dev**.

Users install an APK and open **SnapStock** like a normal app. There is **no address
bar and no visible URL** — only your existing responsive React UI, plus camera /
file-upload support for shelf scans.

```
Android APK
   └─ WebView (full screen)
         └─ https://snapstock.rashmika.dev
```

## What is included

- Package id: `com.snapstock.app`
- Splash screen (SnapStock lime / teal branding)
- Full-screen WebView (no browser chrome)
- Android back button → in-app history
- Camera + mic permissions for `getUserMedia` scanning
- File / gallery chooser + camera capture for uploads
- Offline / network error screen with Retry
- Pull-to-refresh
- External links open in the system browser
- Downloads via DownloadManager
- Signed release APK instructions (sideload free; Play Store has a fee)

## Requirements

1. [Android Studio](https://developer.android.com/studio) (free) — Ladybug / newer recommended  
2. JDK 17 (bundled with Android Studio)  
3. An Android phone (USB debugging) or emulator  

## Open the project

1. Open Android Studio  
2. **File → Open** → select the `android/` folder in this repo  
3. Let Gradle sync finish (first sync downloads the SDK / Gradle)  
4. If prompted to install SDK Platform 35 / Build-Tools, accept  

## Run on a phone (debug)

1. Enable **Developer options** + **USB debugging** on the phone  
2. Plug in the phone, accept the RSA prompt  
3. In Android Studio: select the device → click **Run** (green play)  

Debug builds use application id `com.snapstock.app.debug`.

## Build a release APK (sideload)

### 1. Create a keystore (once)

In Android Studio:

**Build → Generate Signed App Bundle / APK → APK → Create new…**

Or from a terminal (from `android/`):

```bash
keytool -genkeypair -v -keystore snapstock-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias snapstock
```

Keep `snapstock-release.jks` and the passwords private. Do **not** commit the keystore.

### 2. Generate the APK in Android Studio

1. **Build → Generate Signed App Bundle / APK**  
2. Choose **APK**  
3. Select your keystore / alias  
4. Build type: **release**  
5. Finish  

Output is typically:

`android/app/release/app-release.apk`

### 3. Or build from the command line

```bash
cd android
./gradlew assembleRelease
# Windows: gradlew.bat assembleRelease
```

Unsigned/debug-aligned output lands under `app/build/outputs/apk/`. For a properly
signed release, prefer the Android Studio signing wizard above, or configure
`signingConfigs` in `app/build.gradle.kts`.

### 4. Install on phones

```bash
adb install -r app-release.apk
```

Or copy the APK to the phone and open it (allow “Install unknown apps” for your file manager).

## Change the website URL

Edit `WEB_URL` in `app/build.gradle.kts`:

```kotlin
buildConfigField("String", "WEB_URL", "\"https://snapstock.rashmika.dev\"")
```

Also update hosts in:

- `MainActivity.kt` → `allowedHosts`
- `res/xml/network_security_config.xml`

## Google Sign-In note

Google often blocks OAuth inside embedded WebViews. **Email / password login works
normally.** If Google Continue fails inside the APK, use email login, or we can
later wire Google Sign-In through Chrome Custom Tabs / the native Google SDK.

## Play Store vs sideload

| Path | Cost |
|------|------|
| Build + install APK yourself | Free |
| Google Play developer account | One-time registration fee |

## Project layout

```
android/
  app/src/main/
    java/com/snapstock/app/
      SplashActivity.kt
      MainActivity.kt
    res/…
    AndroidManifest.xml
  app/build.gradle.kts
  README.md   ← this file
```
