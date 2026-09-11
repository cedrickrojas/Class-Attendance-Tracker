# Class Trackerbonia — Smart Class Attendance Tracker

An iPhone-first class attendance tracker for teachers, built with **Ionic Framework + Vue 3 +
TypeScript + Firebase Firestore + Capacitor**, ready to open in **Xcode** and run on a real iPhone.

All student and attendance data is stored in **Firebase Firestore**. There is no mock data anywhere
in the app — every number on the dashboard is calculated from what is actually saved in your
database.

---

## Table of contents

1. [Features](#1-features)
2. [Requirements](#2-requirements)
3. [Install](#3-install)
4. [Firebase setup](#4-firebase-setup)
5. [Firestore database setup](#5-firestore-database-setup)
6. [Accounts, roles and sign-in](#6-accounts-roles-and-sign-in)
7. [Run and test in the browser](#7-run-and-test-in-the-browser)
8. [Testing checklist](#8-testing-checklist)
9. [Capacitor iOS setup](#9-capacitor-ios-setup)
10. [Xcode configuration](#10-xcode-configuration)
11. [Firebase configuration for iOS (GoogleService-Info.plist)](#11-firebase-configuration-for-ios-googleservice-infoplist)
12. [Testing on a physical iPhone](#12-testing-on-a-physical-iphone)
13. [App icon and launch screen](#13-app-icon-and-launch-screen)
14. [Build commands](#14-build-commands)
15. [Project structure](#15-project-structure)
16. [How the code is organised](#16-how-the-code-is-organised)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Features

| Area | What you can do |
| --- | --- |
| **Home** | Total students, Present / Absent / Late / Excused today, today's attendance rate and the overall rate — all live from Firestore. |
| **Students** | Add, edit, delete, search, view details and full attendance history. Swipe a student left for quick Edit / Delete. |
| **Attendance** | Record attendance: student, date, status (Present / Absent / Late / Excused) and remarks. |
| **Records** | Browse every record grouped by date, filter by status and by a specific date, search by name or student ID, edit or delete with a confirmation alert. |
| **Student history** | Per-student attendance rate, per-status counts and the full dated history. |
| **Appearance** | System Theme / Dark / Light, remembered between launches. Dark is the designed default. |
| **Accounts** | Landing page, sign up, log in, forgot password, persistent session, logout. |
| **Roles** | Admin has full access; students see the class list, record only their own attendance, and view their own records. |
| **Feedback** | Ionic toasts for every successful action, friendly error messages for every failure. |

Behaviour worth knowing:

- **Student IDs must be unique.** Saving a duplicate is rejected with a clear message.
- **One record per student per day.** Recording a second one for the same date is rejected and you
  are pointed to the Records tab to edit the existing one.
- **Renaming a student** updates the name stored on their past attendance records too.
- **Deleting a student** also deletes all of that student's attendance records.
- **Attendance Rate = Present ÷ Total attendance records × 100**, rounded to a whole number.

---

## 2. Requirements

| Tool | Version | Needed for |
| --- | --- | --- |
| Node.js | 20 or newer | Everything |
| npm | 10 or newer | Everything |
| A Firebase account | free "Spark" plan is enough | The database |
| **macOS + Xcode 15+** | | **Only for the iPhone build** |
| CocoaPods | 1.12+ | iOS dependencies |

> ⚠️ **Important:** Xcode only runs on macOS. You can develop and fully test this app in a browser on
> Windows or Linux, but steps 8–12 (Capacitor iOS, Xcode, running on an iPhone) must be done on a
> Mac. Copy the project folder to a Mac — or use a Mac in your school lab — when you reach that
> point.

Optional but handy:

```bash
npm install -g @ionic/cli    # gives you the `ionic serve` command
```

---

## 3. Install

```bash
npm install
```

That is all — Ionic, Vue, Firebase and Capacitor are already listed in `package.json`.

---

## 4. Firebase setup

The Firebase web config lives directly in [`src/firebase.ts`](src/firebase.ts).

**Step 1 — Create the project**

1. Go to <https://console.firebase.google.com> and click **Add project**.
2. Name it `Class Trackerbonia` (any name works). Google Analytics is optional — you can turn it off.
3. Wait for the project to be created, then click **Continue**.

**Step 2 — Register a Web app**

1. On the project overview page, click the **Web** icon (`</>`).
2. App nickname: `Class Trackerbonia Web`. Do **not** tick "Firebase Hosting" (not needed).
3. Click **Register app**. Firebase shows you a `firebaseConfig` object.

**Step 3 — Paste it into `src/firebase.ts`**

```ts
const firebaseConfig = {
  apiKey: 'AIzaSy...',
  authDomain: 'class-trackerbonia.firebaseapp.com',
  projectId: 'class-trackerbonia',
  storageBucket: 'class-trackerbonia.firebasestorage.app',
  messagingSenderId: '1053722962904',
  appId: '1:1053722962904:web:b0a0b860c19a1e7140a0ad',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

This project is already filled in with the `class-trackerbonia` project, so there is nothing to do
unless you switch to a different Firebase project.

> **Restart the dev server after editing this file** if it is already running.

**Are these keys secret?** No. The Firebase web SDK sends `apiKey`, `projectId` and `appId` with
every request, so they are visible in any browser build no matter where you store them — they
identify your project, they do not authorise anything. What actually protects your data are the
**Firestore security rules** in the next section. (An `apiKey` you *should* keep private would be a
server key or a service-account JSON — never put one of those in this app.)

If the config is ever left blank, the app does not crash: every screen shows a friendly
"Firebase is not connected" banner instead.

---

## 5. Firestore database setup

**Step 1 — Create the database**

1. In the Firebase console, open **Build → Firestore Database**.
2. Click **Create database**.
3. Choose a location close to you (for the Philippines, `asia-southeast1` is a good pick). The
   location cannot be changed later.
4. Start in **test mode** for now, then click **Enable**.

**Step 2 — Collections**

You do **not** need to create the collections by hand. The app creates them automatically the first
time you save something:

`students` — one document per student:

```js
{
  studentId: "2026-0001",
  studentName: "Juan Dela Cruz",
  courseSection: "BSIT 2-A",
  createdAt: "2026-09-10T02:15:31.482Z"
}
```

`attendance` — one document per student per day:

```js
{
  studentDocId: "kZ8xW2...",       // links back to the student document
  studentId: "2026-0001",
  studentName: "Juan Dela Cruz",
  date: "2026-09-10",              // YYYY-MM-DD, easy to filter and sort
  status: "Present",               // Present | Absent | Late | Excused
  remarks: "On time",
  createdAt: "2026-09-10T02:16:02.115Z"
}
```

**Step 3 — Security rules**

Test mode leaves your database open to anyone for 30 days, which is fine while you are building.
Open **Firestore Database → Rules** to see them:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // DEVELOPMENT ONLY - anyone with your project ID can read and write.
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2026, 12, 31);
    }
  }
}
```

> 🔒 **Before you share this app with anyone, lock it down.** This project has no login screen, so
> open rules mean any person on the internet could read or delete your class data. The proper fix is
> to add Firebase Authentication and then use rules like:
>
> ```js
> match /{document=**} {
>   allow read, write: if request.auth != null;
> }
> ```
>
> Adding sign-in is outside the scope of this app, but keep it in mind before real classroom use.

**Indexes:** none are needed. Every query the app sends uses a single field, and sorting/grouping is
done in the app, so Firestore will never ask you to create a composite index.

---

## 6. Accounts, roles and sign-in

The app opens on a public **Landing Page**. Everything under `/tabs/*` requires a
signed-in account.

```
Landing  ->  Get Started  ->  Sign Up  ->  Student account
         ->  Log In       ->  Admin or Student  ->  Dashboard
```

There are exactly two roles:

| Role | How it is created | What it can do |
| --- | --- | --- |
| `admin` | Provisioned once with a script - **never** through the app | Everything: student CRUD, attendance CRUD for anyone, all records, full dashboard |
| `student` | Public Sign Up, always | Views the class list, records **their own** attendance, sees their own records and stats |

The Sign Up form has no role field, and `services/auth.ts` hard-codes
`role: 'student'`. The Firestore rules reject any profile write that says
otherwise, so a crafted request cannot create an admin either.

### Step 1 - Enable Email/Password sign-in

Firebase console → **Build → Authentication → Get started** →
**Sign-in method → Email/Password → Enable**.

Nothing below works until this is done - the app will report
"Sign-in is not enabled for this project yet."

### Step 2 - Create the administrator

```bash
npm run create-admin
```

That creates the auth account and its `users/{uid}` profile with `role: "admin"`:

| | |
| --- | --- |
| Email | `admin@class-trackerbonia.com` |
| Password | `admin123` |

Re-running it is safe - it repairs the profile if the account already exists.

> The password is the demo credential from the project brief. Change it in the
> Firebase console before anyone real uses this. It lives only in
> `scripts/create-admin.mjs`, never in the app bundle.

### Step 3 - Publish the security rules

Copy [`firestore.rules`](firestore.rules) into
**Firestore Database → Rules → Publish**.

> ⚠️ **Do this before letting anyone use the app.** Until the rules are published
> Firestore is wide open: a signed-in student can rename, delete or fabricate any
> student and any attendance record by calling Firestore directly, no matter what
> the app's buttons show.

Verify it worked, with a student account:

```bash
npm run security-check -- student@example.com theirPassword
```

Every line should read `[PASS]`. The probe stops immediately if any forbidden
write is allowed, rather than continuing and damaging data.

This is the part that actually enforces permissions. Hidden buttons are cosmetic -
a student can call Firestore directly, so the rules check, server-side:

- only an admin writes `students`
- a student may create or edit attendance **only** where `studentDocId` equals the
  one on their own profile (read from the server, not from the request)
- `role`, `uid` and `studentDocId` are immutable on a profile, which blocks
  privilege escalation

### Student IDs are generated, never typed

Nobody chooses a student ID. The app issues them in sequence - `STU-0001`,
`STU-0002`, `STU-0003` - from a counter bumped inside a Firestore transaction, so
two people registering at the same moment can never receive the same number.

There are two ways a student record gets created, and both call the same
generator:

| Who | What they fill in | What the app does |
| --- | --- | --- |
| **Admin** → Students → **+** | Full Name, Course / Section | Generates the ID, then shows it with a **Copy Student ID** button so it can be handed over |
| **Student** → Sign Up | Full Name, Course / Section, Email, Password | Generates the ID, creates the student record, links the account, and shows the ID on their dashboard |

The ID is **permanent**. The edit form displays it read-only, and the Firestore
rules reject any update that tries to change it - attendance records point at it.

### What each role sees

**Student** - the Attendance tab shows their own name and ID with no student
picker; the dashboard shows their personal totals and today's status; Students is
read-only; Records shows their own history without edit or delete.

**Admin** - the student picker, full CRUD everywhere, and the whole-class
dashboard.

Both roles use the same five tabs.

---

## 7. Run and test in the browser

```bash
ionic serve
```

or, without the Ionic CLI:

```bash
npm run dev
```

Then open <http://localhost:8100>.

**Test it as an iPhone:** open Chrome DevTools (F12) → click the device-toolbar icon (Ctrl/Cmd +
Shift + M) → choose **iPhone 14 Pro**. The app is forced into Ionic's iOS mode, so the browser
preview looks the same as it will on the device.

Dark mode in the browser: DevTools → **⋮ → More tools → Rendering → Emulate CSS
prefers-color-scheme: dark**, or just pick Dark under the Settings gear on the Home tab.

---

## 8. Testing checklist

Run through this before building for iOS.

**Students**

- [ ] Add a student — a green "Student added successfully." toast appears and the list updates.
- [ ] Try saving an empty form — "Student ID is required." appears; nothing is written.
- [ ] Try a duplicate student ID — it is rejected with a clear message.
- [ ] Swipe a student left → **Edit** → change the name → "Student updated successfully."
- [ ] Search by name, by student ID and by section.
- [ ] Tap a student to open their history.
- [ ] Swipe left → **Delete** → confirm → "Student deleted successfully."

**Attendance**

- [ ] Record **Present**, then **Absent**, **Late** and **Excused** for different students.
- [ ] Pick a different date with the date button.
- [ ] Add remarks and confirm they show on the Records tab.
- [ ] Record the same student twice on the same date — it is rejected.
- [ ] Records tab → **Edit** on a card → change the status → "Attendance updated successfully."
- [ ] Records tab → **Delete** → the "Delete Attendance?" alert appears → confirm.
- [ ] Filter by each status, filter by **Today**, then **Clear**, and pick a specific date.

**Dashboard**

- [ ] Total Students matches the Students tab.
- [ ] Present / Absent / Late / Excused match today's records.
- [ ] Attendance Rate equals `present ÷ total records today × 100`.
- [ ] Pull down to refresh.

**Accounts and roles**

- [ ] Opening the app shows the Landing Page, not the dashboard.
- [ ] Visiting `/tabs/home` while signed out redirects to `/login`.
- [ ] Sign Up has no role field and no Student ID field.
- [ ] After signing up, the dashboard shows an assigned ID like `STU-0001`.
- [ ] Admin → Students → **+** asks only for Full Name and Course / Section, then
      shows the generated ID with a Copy button.
- [ ] Editing a student shows the ID as read-only.
- [ ] A student opening Attendance sees their own name - no student picker.
- [ ] A student sees no Add / Edit / Delete on Students.
- [ ] The admin sees the picker and full CRUD.
- [ ] Close and reopen the app - you are still signed in.
- [ ] Log out returns to the Landing Page.
- [ ] `npm run security-check` passes every line with a student account.

**Cross-checks**

- [ ] Open the Firebase console → Firestore → confirm the documents really exist.
- [ ] Switch Appearance to Dark, close and reopen the app — the choice is remembered.
- [ ] All five tabs navigate correctly (Home, Students, Attendance, Records, Settings).

---

## 9. Capacitor iOS setup

**Do these steps on a Mac.**

```bash
# 1. Build the web app into dist/
npm run build

# 2. Add the native iOS project (creates the ios/ folder) - once only
npx cap add ios

# 3. Copy the latest build into the native project
npx cap sync ios

# 4. Open the project in Xcode
npx cap open ios
```

`capacitor.config.ts` is already configured:

```ts
appId: 'com.classtrack.attendance',
appName: 'Class Trackerbonia',
webDir: 'dist',
```

**Every time you change the Vue code**, re-run:

```bash
npm run build && npx cap sync ios
```

`sync` copies `dist/` into the native project *and* updates native dependencies. Without it, Xcode
keeps running your previous build.

---

## 10. Xcode configuration

Open `ios/App/App.xcworkspace` (Xcode opens the **workspace**, not the `.xcodeproj` — `npx cap open
ios` does this for you). Select the **App** target in the left sidebar, then:

**Bundle Identifier** — *Signing & Capabilities* tab → **Bundle Identifier**. It should already read
`com.classtrack.attendance`. If that ID is taken, use something unique such as
`com.yourname.classtrack` — and change `appId` in `capacitor.config.ts` to match.

**Apple Developer Team** — same tab → tick **Automatically manage signing** → pick your **Team**. A
free Apple ID works for testing on your own device: Xcode → **Settings → Accounts → +** → sign in
with your Apple ID, and it appears in the Team dropdown as "(Personal Team)".

**Signing & Capabilities** — with automatic signing on, Xcode creates the provisioning profile for
you. If you see "Failed to register bundle identifier", change the bundle ID to something unique and
try again.

**iOS Deployment Target** — *General* tab → **Minimum Deployments → iOS**. Capacitor 7 requires
**iOS 14.0 or newer**; leave the default unless you have a reason to change it. It must not be
higher than the iOS version on your test iPhone.

**App name** — *General* tab → **Display Name**: `Class Trackerbonia`. This is the name under the icon on the
home screen. (You can also edit `CFBundleDisplayName` in `ios/App/App/Info.plist`.)

**Version and build** — *General* tab → **Version** `1.0`, **Build** `1`. Increase the build number
for each new install if iOS complains about a duplicate.

**Device orientation** — *General* → **Deployment Info**: leave **Portrait** ticked and untick the
landscape options if you want the app locked to portrait, which suits this layout.

---

## 11. Firebase configuration for iOS (GoogleService-Info.plist)

**Does this app need `GoogleService-Info.plist`? No — and here is why.**

Class Trackerbonia uses the **Firebase JavaScript (Web) SDK** inside the Capacitor web view. All Firestore
traffic goes through the web SDK using the config in `src/firebase.ts`, which is compiled into the
JS bundle at build time. The native `GoogleService-Info.plist` is only read by the **native** Firebase
iOS SDK, which this app does not use. Your iPhone build will talk to Firestore correctly with no
plist at all.

**If you later add a native Firebase plugin** (for example native Push Notifications, Crashlytics or
Analytics through `@capacitor-firebase/*`), you will need the file. Here is how:

1. Firebase console → **Project settings** (gear icon) → **General** → **Your apps** → **Add app** →
   **iOS**.
2. **Apple bundle ID:** `com.classtrack.attendance` — it must match exactly what is in Xcode.
3. Click **Register app**, then **Download GoogleService-Info.plist**.
4. In Xcode, drag the file onto the **`App`** folder in the project navigator (the yellow folder that
   contains `Info.plist`), and in the dialog:
   - tick **Copy items if needed**
   - tick the **App** target under *Add to targets*
5. On disk it should sit at `ios/App/App/GoogleService-Info.plist`.

**Keep it out of git.** This project's `.gitignore` already ignores that path. The plist and the web
keys are configuration rather than passwords, but Firestore security rules — not secrecy — are what
actually protect your data (see [section 5](#5-firestore-database-setup)).

---

## 12. Testing on a physical iPhone

1. Connect your iPhone to the Mac with a cable and **Trust This Computer** on the phone.
2. On the iPhone: **Settings → Privacy & Security → Developer Mode → On**, then restart the phone
   (required once on iOS 16+).
3. In Xcode, pick your iPhone from the device dropdown at the top (next to the scheme name).
4. Confirm *Signing & Capabilities* shows your Team with no red errors.
5. Press **▶ Run** (Cmd + R).
6. The first launch fails with **"Untrusted Developer"** if you used a free Apple ID. On the iPhone:
   **Settings → General → VPN & Device Management → your Apple ID → Trust**. Then press Run again.
7. The app installs and opens. Add a student, record attendance, then check the Firebase console —
   the documents appear there in real time.

Notes:

- Apps signed with a **free** Apple ID expire after **7 days**; just re-run from Xcode to renew.
  A paid Apple Developer Program membership ($99/year) extends this to a year and is required for
  TestFlight and the App Store.
- Your iPhone needs an internet connection — Firestore is a cloud database.
- To debug the web layer running on the phone: Safari on the Mac → **Develop → [your iPhone] →
  Class Trackerbonia**. That gives you the full console and inspector. (Enable Safari → Settings → Advanced →
  *Show features for web developers* first.)

---

## 13. App icon and launch screen

Your icon is already prepared and ready to drop into Xcode:

| File | What it is |
| --- | --- |
| [`resources/AppIcon-1024.png`](resources/AppIcon-1024.png) | **1024 x 1024, square, fully opaque, no alpha** - exactly what Xcode requires |
| [`resources/logo-source.png`](resources/logo-source.png) | The original artwork, kept for future edits |
| `public/favicon.png` | Browser tab icon (rounded, transparent) |
| `public/apple-touch-icon.png` | Home-screen icon when run as a web app |

**Adding it in Xcode**

1. Open `ios/App/App.xcworkspace`.
2. In the project navigator, open `App/Assets.xcassets` and select **AppIcon**.
3. Drag `resources/AppIcon-1024.png` into the **1024pt "App Store"** slot. Xcode 15+ generates every
   other size from it automatically.
4. Clean and rebuild (**Cmd + Shift + K**, then **Cmd + R**).

> Home-screen icons are cached aggressively. If you still see the old icon, delete the app from the
> iPhone first, then run again.

**Why the file looks slightly different from the original artwork:** iOS requires a square, opaque
image and applies its own rounded-corner mask. The original PNG has rounded corners and a
transparent background, so it was flattened onto a matching gradient and given a small overscan -
otherwise you would see dark corners or a visible outline once iOS rounds it.

**A note on the text:** the words "ClassTrackerbonia" are readable at 1024px but will be very small
on the home screen, where the icon renders at about 60pt. Apple's Human Interface Guidelines
recommend leaving text out of app icons for that reason. The icon still works as-is - the graduation
cap and checkmark carry it - but if you ever want a crisper look, a version with just the cap,
students and checkmark (no wordmark) would read better at small sizes.

**Launch screen**

Capacitor generates `ios/App/App/Base.lproj/LaunchScreen.storyboard`. To customise it, open that file
in Xcode and change the background colour (select the view → *Attributes inspector* → Background), or
drop an image view onto it. Keep it simple — a plain background matching the app tint looks best.

---

## 14. Build commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `ionic serve` / `npm run dev` | Dev server with hot reload at <http://localhost:8100> |
| `npm run typecheck` | TypeScript check only |
| `npm run build` | Type-check, then build the production web bundle into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run create-admin` | Create the pre-configured administrator (run once) |
| `npm run security-check -- <email> <password>` | Verify the Firestore rules actually block a student |
| `npx cap add ios` | Create the native iOS project (once) |
| `npx cap sync ios` | Copy the latest build + update native dependencies |
| `npx cap open ios` | Open the project in Xcode |

Release build for the App Store (Mac): `npm run build && npx cap sync ios`, then in Xcode choose
**Any iOS Device (arm64)** and **Product → Archive**.

---

## 15. Project structure

```text
Class Trackerbonia/
│
├── src/
│   ├── components/
│   │   ├── StatCard.vue            # dashboard statistic tile
│   │   ├── StudentCard.vue         # swipeable student row
│   │   ├── AttendanceCard.vue      # attendance record card with Edit/Delete
│   │   ├── StudentFormModal.vue    # shared Add / Edit student form
│   │   ├── ConnectionNotice.vue    # "Firebase not connected" / offline banner
│   │   └── EmptyState.vue          # friendly empty screens
│   │
│   ├── views/
│   │   ├── TabsPage.vue            # bottom tab bar shell
│   │   ├── HomePage.vue            # dashboard
│   │   ├── StudentsPage.vue        # list + search + add/edit/delete
│   │   ├── StudentDetailPage.vue   # per-student rate and history
│   │   ├── AttendancePage.vue      # record / edit attendance
│   │   ├── RecordsPage.vue         # all records, filters
│   │   └── SettingsPage.vue        # appearance (System / Light / Dark)
│   │
│   ├── composables/
│   │   ├── useAuth.ts              # session, role, login/signup/logout
│   │   ├── useClassData.ts         # shared reactive store + statistics
│   │   ├── useFeedback.ts          # toasts and confirmation alerts
│   │   └── useAppearance.ts        # light / dark / system
│   │
│   ├── services/
│   │   ├── auth.ts                 # authentication + user profiles
│   │   └── db.ts                   # every Firestore read/write + error handling
│   │
│   ├── router/
│   │   └── index.ts                # Ionic Vue Router with the five tabs
│   │
│   ├── theme/
│   │   └── variables.css           # iOS-style light + dark theme
│   │
│   ├── utils/date.ts               # "YYYY-MM-DD" helpers
│   ├── types/index.ts              # Student / AttendanceRecord / UserProfile
│   ├── firebase.ts                 # Firebase config + init, exports `db` and `auth`
│   ├── App.vue
│   └── main.ts
│
├── public/                         # favicon.png, apple-touch-icon.png
├── resources/                      # AppIcon-1024.png (for Xcode), logo-source.png
├── firestore.rules                 # the real permission enforcement
├── scripts/create-admin.mjs        # one-time admin provisioner
├── capacitor.config.ts
├── ionic.config.json
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 16. How the code is organised

Three layers, so each file has one job:

**1. `src/services/db.ts` — the only file that talks to Firestore.**
It exports `addStudent`, `getStudents`, `updateStudent`, `deleteStudent`, `addAttendance`,
`getAttendance`, `getAttendanceForStudent`, `updateAttendance` and `deleteAttendance`. It validates
input, checks for duplicates, and converts every Firebase failure into a plain-language `AppError`.
Raw Firebase errors go to the console, never to the teacher's screen:

```ts
case 'unavailable':
  return new AppError('Cannot reach the database. Please check your internet connection.');
```

**2. `src/composables/useClassData.ts` — one shared reactive store.**
Every screen reads the same `students` and `attendance` arrays, so adding a student on the Students
tab instantly updates the Home dashboard and the Attendance picker. It also holds the statistics:

```ts
summary.rate = summary.total === 0 ? 0 : Math.round((summary.present / summary.total) * 100);
```

**3. `src/views/*.vue` — screens.**
They only handle layout, user input and feedback. Every page uses `<script setup lang="ts">` with the
Composition API, and refreshes its data through `onIonViewWillEnter` so numbers are current every
time you switch tabs.

---

## 17. Troubleshooting

**"Sign-in is not enabled for this project yet."**
Email/Password sign-in is off. Firebase console → Build → Authentication →
Get started → Sign-in method → Email/Password → Enable.

**"Student ID not found. Please contact your administrator."**
The Student ID typed at Sign Up is not in the `students` collection. An admin must
add the student first - sign-up deliberately cannot invent one.

**"You do not have permission to perform this action."**
The Firestore rules refused the write. For a student that is usually correct
behaviour (editing another student's record). If it happens to the admin, check
that `users/{adminUid}.role` is exactly `"admin"`.

**"Firebase is not connected" banner**
The `firebaseConfig` object in `src/firebase.ts` is missing `apiKey`, `projectId` or `appId`. Paste
the values from the Firebase console and restart with `ionic serve`.

**Nothing saves / "You do not have permission to do that"**
Your Firestore security rules expired or deny writes. Firebase console → Firestore → **Rules** — see
[section 5](#5-firestore-database-setup).

**"Cannot reach the database. Please check your internet connection."**
No network, or a firewall is blocking `firestore.googleapis.com`. On a school network, try a mobile
hotspot.

**"Missing or insufficient permissions" in the console**
Same as above — it is a rules problem, not a code problem.

**The dashboard shows 0 for everything**
The dashboard counts **today's** records. Records saved for a different date show up in the Records
tab and in the overall rate, not in today's numbers. Check the date you picked when saving.

**Changes do not appear on the iPhone**
You forgot `npm run build && npx cap sync ios`. Xcode runs whatever was last synced into `ios/`.

**`npx cap add ios` fails on Windows**
Expected — the iOS platform needs macOS with Xcode. Do steps 8–12 on a Mac.

**`pod install` fails / "CocoaPods not installed"**
On the Mac: `sudo gem install cocoapods`, then `cd ios/App && pod install`. On Apple Silicon you may
need `brew install cocoapods` instead.

**"Untrusted Developer" on the iPhone**
Settings → General → VPN & Device Management → your Apple ID → **Trust**.

**"Signing for App requires a development team"**
Xcode → target **App** → *Signing & Capabilities* → tick **Automatically manage signing** and choose
your Team. Add your Apple ID under Xcode → Settings → Accounts if the list is empty.

**The app worked, then stopped opening after about a week**
Free Apple ID builds expire after 7 days. Re-run from Xcode.

**White screen on the device**
Almost always a build that was not synced, or a JS error. Connect Safari's Web Inspector (Develop →
your iPhone) and read the console.

**Blank screen after `npm run build` in the browser**
Serve `dist/` with `npm run preview` rather than opening `index.html` directly from the file system —
the router needs a real HTTP server.
