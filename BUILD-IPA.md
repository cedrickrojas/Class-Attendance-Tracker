# Building the `.ipa`

**An `.ipa` can only be produced on macOS.** Apple's toolchain (`xcodebuild`,
CocoaPods, the iOS SDK) does not run on Windows, and the file must be signed with
an Apple certificate or no device will install it. There is no Windows workaround.

The `ios/` project in this repo is already scaffolded, icon installed and synced,
so on a Mac it is about four commands.

---

## What is already done

| | |
| --- | --- |
| `ios/` native project | created (`npx cap add ios`) |
| Web build copied in | `dist/` → `ios/App/App/public` |
| Bundle identifier | `com.classtrack.attendance` |
| Display name | `Class Trackerbonia` |
| App icon (1024, opaque, no alpha) | installed in `Assets.xcassets/AppIcon` |
| Launch screen | dark `#0B0F14` with the app mark, so it does not flash white |

## What only a Mac can do

`pod install`, compiling, signing, archiving, exporting.

---

## Route 1 — On a Mac (the normal way)

Copy the whole project folder over (you can leave out `node_modules`), then:

```bash
npm install
npm run build
npx cap sync ios
sudo gem install cocoapods      # once, if not installed
cd ios/App && pod install && cd ../..
npx cap open ios                # opens App.xcworkspace in Xcode
```

In Xcode, select the **App** target:

1. **Signing & Capabilities** → tick *Automatically manage signing* → choose your
   **Team**. A free Apple ID works (Xcode → Settings → Accounts → **+**).
2. If it says *"Failed to register bundle identifier"*, change the Bundle
   Identifier to something unique such as `com.cedrick.classtrackerbonia`, and
   change `appId` in `capacitor.config.ts` to match.

### For your own phone (no paid account)

Plug the iPhone in, pick it in the device dropdown, press **▶ Run**. On the phone:
Settings → General → VPN & Device Management → your Apple ID → **Trust**.

That installs the app without ever producing an `.ipa`. Builds signed with a free
Apple ID expire after **7 days**; re-run from Xcode to renew.

### To actually get an `.ipa` file

1. Device dropdown → **Any iOS Device (arm64)**
2. **Product → Archive**
3. In the Organizer window: **Distribute App**
4. Pick the method:
   - **Ad Hoc** or **Development** — an `.ipa` for specific registered devices
     (needs a **paid** Apple Developer Program membership, $99/year)
   - **App Store Connect** — for TestFlight / the App Store (also paid)
5. Xcode writes the `.ipa` into the export folder you choose.

> A free Apple ID **cannot** export an `.ipa`. It can only install directly to a
> device that is plugged in. Exporting requires the paid membership.

---

## Route 2 — No Mac

A cloud macOS build service can do the archive and hand you the `.ipa`. All of
them still need an Apple Developer account for signing.

| Option | Notes |
| --- | --- |
| **GitHub Actions** `macos-latest` runner | Free for public repos; you upload your signing certificate and profile as secrets |
| **Codemagic** | Built for Ionic/Capacitor, has a free tier, guided signing setup |
| **Ionic Appflow** | Same company as Ionic; "Package" builds produce the `.ipa` |
| **MacinCloud / MacStadium** | A rented Mac you remote into and use exactly as Route 1 |

---

## Re-syncing after code changes

Any change to `src/` needs the web build copied into the native project again:

```bash
npm run build && npx cap sync ios
```

Xcode runs whatever was last synced, so skipping this is the usual reason a change
"does not show up" on the phone.

---

## Before you ship it to anyone

- The Firestore rules are published - good. Re-check with
  `npm run security-check -- <studentEmail> <password>`.
- Change the admin password from `admin123` in the Firebase console.
- The app has no camera or photo features, so no camera usage strings are needed
  in `Info.plist`.
