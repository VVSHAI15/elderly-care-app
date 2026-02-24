# guardian.ai

AI-powered elderly care coordination platform. Connects care teams (family members, caregivers, healthcare providers) around a shared patient profile with real-time messaging, medication tracking, appointment management, and AI-assisted health summaries.

---

## Features

- **Authentication** — NextAuth with credential provider + dedicated mobile JWT endpoint (`/api/auth/mobile-login`)
- **Care Team** — invite codes, role-based access (admin, caregiver, family)
- **Medications & Appointments** — full CRUD with reminders
- **Real-time Notifications** — Pusher-powered live updates
- **AI Summaries** — OpenAI-backed health report generation
- **Push Notifications** — Firebase Cloud Messaging
- **Mobile** — Capacitor wrapper for iOS and Android (loads the hosted web app in a native WebView)

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ |
| npm | 10+ |
| Xcode | 15+ (iOS development only, macOS required) |
| Android Studio | Hedgehog or newer (Android development only) |
| CocoaPods | `sudo gem install cocoapods` (iOS only) |

---

## Web Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd elderly-care-app

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local — fill in all required values (see table below)

# 4. Set up the database
npx prisma migrate dev --name init
# Optional: seed demo data
npx prisma db seed

# 5. Start the dev server
npm run dev
# → http://localhost:3000
```

---

## Mobile Setup

The Capacitor app points a native WebView at the running Next.js server (no static export needed).

### iOS (macOS only)

```bash
# Install CocoaPods dependencies
cd ios/App && pod install && cd ../..

# Open Xcode
npm run cap:open:ios
# In Xcode: select a simulator or connected device → Run (⌘R)
```

### Android

```bash
# Open Android Studio
npm run cap:open:android
# In Android Studio: select an AVD or connected device → Run
```

### Pointing the app at a different server

Set `CAPACITOR_SERVER_URL` in your `.env.local` before opening the native project:

```env
# Simulator (default)
CAPACITOR_SERVER_URL=http://localhost:3000

# Physical device on the same Wi-Fi network
CAPACITOR_SERVER_URL=http://192.168.1.42:3000

# Production
CAPACITOR_SERVER_URL=https://your-app.vercel.app
```

After changing this value, re-run `npm run cap:sync` to push the updated config into the native projects.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (or `file:./dev.db` for SQLite) |
| `NEXTAUTH_URL` | ✅ | Full URL of the app (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | ✅ | Random secret — generate with `openssl rand -base64 32` |
| `PUSHER_APP_ID` | ✅ | Pusher app ID |
| `PUSHER_SECRET` | ✅ | Pusher secret key |
| `NEXT_PUBLIC_PUSHER_KEY` | ✅ | Pusher public key |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | ✅ | Pusher cluster (e.g. `us2`) |
| `RESEND_API_KEY` | ✅ | Resend API key for email notifications |
| `FIREBASE_PROJECT_ID` | ✅ | Firebase project ID for push notifications |
| `FIREBASE_CLIENT_EMAIL` | ✅ | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | ✅ | Firebase service account private key |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public-facing app URL |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for AI health summaries |
| `CAPACITOR_SERVER_URL` | Mobile only | Override the server URL loaded in the native WebView |

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run cap:add:ios` | Add iOS native project (first time only) |
| `npm run cap:add:android` | Add Android native project (first time only) |
| `npm run cap:sync` | Sync web assets and config to native projects |
| `npm run cap:open:ios` | Open project in Xcode |
| `npm run cap:open:android` | Open project in Android Studio |

---

## Database

The app uses Prisma ORM. By default, `.env.example` shows a PostgreSQL connection string. For local development you can use SQLite:

```env
DATABASE_URL="file:./prisma/dev.db"
```

The `prisma/dev.db` file is intentionally **not** tracked in git.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Auth:** NextAuth v4
- **ORM:** Prisma
- **UI:** React 19, Tailwind CSS v4, Lucide icons
- **Real-time:** Pusher
- **Email:** Resend
- **Push notifications:** Firebase Admin SDK
- **AI:** OpenAI
- **Mobile:** Capacitor 8
