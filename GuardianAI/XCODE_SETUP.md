# Guardian.ai iOS — Xcode Setup Guide

All Swift source files are ready. Follow these steps to create the Xcode project
and connect the source files.

---

## Prerequisites

| Requirement | Status |
|---|---|
| macOS 14+ (Sonoma) | Required |
| Xcode 16+ | Required — download from Mac App Store |
| Apple Developer account | Required for TestFlight (free account works for simulator) |
| Node.js / Next.js backend running | Required for API calls |

---

## Step 1 — Create the Xcode Project

1. Open **Xcode** → **Create New Project**
2. Choose **iOS** → **App** → **Next**
3. Fill in the project settings:

   | Field | Value |
   |---|---|
   | Product Name | `GuardianAI` |
   | Team | Your Apple Developer account (or "None" for simulator only) |
   | Organization Identifier | `com.guardianai` (or your own reverse-domain) |
   | Bundle Identifier | `com.guardianai.app` |
   | Interface | **SwiftUI** |
   | Language | **Swift** |

4. Click **Next**, then choose a save location.
   > **Important**: Save it as `GuardianAI.xcodeproj` **inside** the
   > `GuardianAI-iOS/` folder (the one containing this README).

---

## Step 2 — Add the Source Files

Xcode created a default `ContentView.swift` and `GuardianAIApp.swift`. Replace them:

1. In Xcode's **Project Navigator** (left panel), **delete** the default
   `ContentView.swift` and `GuardianAIApp.swift` (move to Trash).

2. **Drag and drop** the entire `GuardianAI/` folder from Finder into the
   Xcode project navigator (onto the `GuardianAI` group).

3. In the dialog that appears:
   - ✅ **Copy items if needed** — check this
   - ✅ **Create groups** — select this
   - Target: **GuardianAI** — check this

4. Click **Finish**.

> Your project navigator should now have groups:
> `Config / Models / Services / ViewModels / Views / ...`

---

## Step 3 — Configure Info.plist

Xcode 13+ uses a generated Info.plist. Add these entries via
**Project → GuardianAI target → Info tab → Custom iOS Target Properties**:

| Key | Value |
|---|---|
| `NSCameraUsageDescription` | "Guardian.ai uses the camera to scan prescriptions and documents." |
| `NSPhotoLibraryUsageDescription` | "Guardian.ai reads your photo library to upload medical documents." |
| `App Transport Security Settings → Allow Arbitrary Loads` | `YES` (only for local dev; remove before App Store submission) |

---

## Step 4 — Set the Bundle Identifier & Version

1. Select the **GuardianAI** project in the navigator → **GuardianAI** target → **General**
2. Set:
   - **Bundle Identifier**: `com.guardianai.app`
   - **Version**: `1.0`
   - **Build**: `1`
3. Under **Minimum Deployments**, set iOS to **17.0** (for `ContentUnavailableView`)

---

## Step 5 — Point to Your Backend

Open `GuardianAI/Config/AppConfig.swift` and update the production URL:

```swift
#else
static let baseURL = "https://YOUR-APP.vercel.app"  // ← Your Vercel URL
#endif
```

For **local development** (simulator):
- The `#if DEBUG` branch already points to `http://localhost:3000`
- Make sure your Next.js dev server is running: `npm run dev`
- The iOS simulator shares your Mac's localhost — no extra config needed.

For **physical device** (local dev):
- Find your Mac's local IP: `ifconfig | grep "inet 192"`
- Change `localhost` to that IP: `http://192.168.x.x:3000`
- The phone and Mac must be on the same Wi-Fi network.

---

## Step 6 — Start the Next.js Backend

The iOS app calls your existing Next.js backend. Before running the iOS app:

```bash
cd /path/to/elderly-care-app
npm run dev
```

The new `/api/auth/mobile-login` endpoint has been added to your Next.js project.

---

## Step 7 — Run in Simulator

1. In Xcode, select an **iPhone 16** simulator from the toolbar
2. Press **⌘ R** (Run)
3. The app should build and launch the Guardian.ai login screen

---

## Step 8 — TestFlight Setup

When you're ready for beta testing:

### 8a. Apple Developer Enrollment
- Go to https://developer.apple.com → Enroll (costs $99/year)
- After enrollment, return to Xcode → Preferences → Accounts → Add your account

### 8b. Certificates & Provisioning
- In Xcode → Project → Signing & Capabilities:
  - ✅ **Automatically manage signing**
  - Select your Team

### 8c. Archive & Upload
```
Xcode menu → Product → Archive
```
Then in the Organizer window:
1. Select the archive → **Distribute App**
2. Choose **TestFlight & App Store**
3. Follow the prompts

### 8d. App Store Connect
- Go to https://appstoreconnect.apple.com
- Add the build to a TestFlight group
- Invite beta testers via email

---

## Project Architecture

```
GuardianAI/
├── GuardianAIApp.swift          # @main entry point
├── ContentView.swift            # Auth router (splash → login → dashboard)
├── Config/
│   └── AppConfig.swift          # Base URL, bundle ID, cookie name
├── Models/
│   ├── User.swift               # User, ConnectedPatient, auth response models
│   ├── Task.swift               # GuardianTask + CreateTaskRequest
│   └── Medication.swift         # Medication model
├── Services/
│   ├── KeychainHelper.swift     # Secure Keychain storage
│   ├── NetworkManager.swift     # URLSession HTTP client + cookie auth
│   ├── AuthService.swift        # Login, register, logout
│   ├── TaskService.swift        # Task CRUD
│   └── MedicationService.swift  # Medication fetch
├── ViewModels/
│   ├── AuthViewModel.swift      # Auth state + session persistence
│   ├── TaskViewModel.swift      # Task list state + actions
│   └── MedicationViewModel.swift
└── Views/
    ├── Auth/
    │   ├── LoginView.swift       # Email/password login
    │   └── RegisterView.swift   # Role-select + register form
    ├── Dashboard/
    │   ├── PatientDashboardView.swift    # TabView for patients
    │   └── CaretakerDashboardView.swift  # Patient list for caregivers
    ├── Tasks/
    │   ├── TaskListView.swift    # Filterable task list with swipe actions
    │   └── AddTaskView.swift     # Create task sheet
    ├── Medications/
    │   └── MedicationsView.swift # Medications list + refill alerts
    └── Documents/
        └── DocumentScannerView.swift  # WKWebView with cookie injection
```

## Auth Strategy

The iOS app uses a **hybrid cookie auth** approach:

1. `POST /api/auth/mobile-login` → returns a **NextAuth-compatible JWT**
2. iOS stores the JWT in the **Keychain** (secure, persists across launches)
3. All API calls send it as: `Cookie: next-auth.session-token=<jwt>`
4. Existing backend routes that call `getServerSession()` work **without any changes**
5. The WKWebView document scanner receives the same cookie via `WKHTTPCookieStore`

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "No such module" build error | Product → Clean Build Folder (⇧⌘K), then rebuild |
| Can't reach localhost on device | Use your Mac's local IP instead of `localhost` |
| 401 Unauthorized from API | Check that `NEXTAUTH_SECRET` is set in `.env` |
| WKWebView shows login page | Ensure the cookie name matches `next-auth.session-token` in AppConfig |
| Build fails on `ContentUnavailableView` | Set minimum deployment target to iOS 17.0 |
