# Portl — Society Management App

Portl brings the everyday life of an apartment community — the security gate, resident communication, and society operations — into a single mobile app. Instead of gate calls, WhatsApp groups, and paper registers, residents, security guards, and society admins each get a purpose-built dashboard for the workflows that matter to them.

## Features

### For Residents
- Approve, reject (with reasoning), or pre-approve visitors (with expiry windows)
- View real-time visitor history
- Raise and track helpdesk complaints (with photo attachments, priority levels, and comment threads)
- Browse the society notice board
- Vote in community polls
- Book amenities (with live slot availability)
- Browse the staff and service provider directory (Services tab)
- Pay outstanding maintenance dues and fines from Payments
- Committee members with granted permissions can open matching admin tools from More

### For Security Guards
- Register new visitors at the gate
- Search residents by name or flat number and raise approval requests
- Auto-approve whitelisted delivery / cab / service partners
- Scan QR passes for pre-approved visitors (with strict expiry enforcement)
- Verify approval status in real time
- Mark visitor entry and exit
- View the full visitor log (with flagging, guard notes, and CSV exports)

### For Society Admins
- Manage towers, flats, and residents
- Approve join requests and generate invite codes
- Manage staff and service providers (including shift timings and service categories)
- Publish notices (with audience targeting, pinning, and cover images)
- Create and manage community polls
- Track and resolve complaints (with full photo and comment thread visibility)
- Configure amenities and booking slots
- Oversee all society operations from a central dashboard
- Issue maintenance dues and manage gate partner whitelist (delivery / cab / service)

### Platform-wide
- Secure, role-based authentication (Resident / Guard / Admin), each restricted to their own dashboard and workflows
- Real-time updates for visitors, notices, and complaints
- Push notifications for approvals, notices, and status updates
- Society onboarding flow — create a new society or join an existing one via invite code
- Dark mode support
- Global React error boundaries (optional Sentry DSN via env)

## Tech Stack

| Layer | Technology |
|---|---|
| App framework | [Expo](https://expo.dev) + [React Native](https://reactnative.dev) |
| Navigation | Expo Router (file-based routing) |
| Language | TypeScript |
| Styling | NativeWind (Tailwind CSS for React Native) |
| State management | Zustand |
| Server state / data fetching | TanStack Query |
| Backend | [Supabase](https://supabase.com) (Postgres, Auth, Realtime, Storage, Edge Functions) |
| Push notifications | Expo Notifications + Supabase Edge Function |
| Quality Assurance | Jest (helpers + RTL), Maestro smoke/login flows, pgTAP RLS/schema checks |
| CI/CD | GitHub Actions |
| Animations | Moti, Lottie, React Native Reanimated |

## Project Structure

```text
src/
├── app/                  # Expo Router routes (file-based)
│   ├── (auth)/           # Login, signup, auth callback
│   ├── (onboarding)/     # Create/join society, invite handling
│   ├── (admin)/           # Admin dashboard and management screens
│   ├── (guard)/           # Guard dashboard, visitor registration, scanning
│   └── (resident)/        # Resident dashboard, visitors, notices, polls, etc.
├── components/            # Shared and screen-specific UI components
├── constants/              # Theme, colors, and static config
├── hooks/                  # Custom React hooks
├── lib/                     # Supabase client, query hooks, helpers
├── stores/                  # Zustand stores (auth, app state)
├── theme/                   # Design tokens
└── types/                   # Shared TypeScript types

__tests__/                 # Jest Unit & Integration tests
.maestro/                  # Maestro E2E test flows
.github/workflows/         # CI/CD pipelines (Lint, Typecheck, Test)

supabase/
├── migrations/            # Database schema, RLS policies, storage buckets
├── tests/                 # pgTAP tests for Row Level Security verification
├── functions/             # Edge Functions (e.g. send-push)
└── seed_demo.sql          # Optional demo data seed script
```

## Prerequisites

- [Node.js](https://nodejs.org) 20 or later
- npm
- A [Supabase](https://supabase.com) project (free tier is sufficient)
- Android emulator / device or iOS simulator with a **development build** (`npx expo run:android` / `run:ios`). Expo Go alone is not enough for Razorpay, camera, or NetInfo.
- (Optional) [Supabase CLI](https://supabase.com/docs/guides/cli) for migrations, Edge Functions, and `npm run test:db`

## Getting Started

### 1. Clone and install dependencies

```bash
git clone https://github.com/Ayush-Panda-design/PORTL-Society-Management-App.git
cd PORTL-Society-Management-App
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, open the **SQL Editor** and run each file in `supabase/migrations/` in order (`001_init.sql` through the latest), or apply them with the Supabase CLI:

   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```

3. From **Project Settings → API**, copy your project URL and anon/public key.

### 3. Configure environment variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run the app (development build required)

Portl uses native modules (Razorpay, camera, NetInfo, push). **Expo Go is not enough** for the full product — use a development build or emulator:

```bash
npx expo run:android
# or
npx expo run:ios
```

Then start Metro if needed:

```bash
npx expo start --dev-client
```

For judge demos, prefer an **EAS preview APK** (`eas build --profile preview`) and link it in your submission.

### 5. (Optional) Run Automated Tests

```bash
npm test                      # Jest: helpers + RTL component tests
npm run typecheck             # App TypeScript
npm run typecheck:functions   # Deno check for Edge Functions (skips if Deno missing)
npm run test:db               # pgTAP: schema, privileges, RLS policy presence
maestro test .maestro/        # E2E smoke + login nav (dev/preview build required)
```

Deploy Edge Functions (push, payments, Ask Portl, outbox dispatcher):

```bash
supabase functions deploy send-push
supabase functions deploy dispatch-push-outbox
# Schedule dispatch-push-outbox every 1–2 minutes (Dashboard Cron or pg_net)
# Auth: Authorization: Bearer <SERVICE_ROLE_KEY>  or  x-cron-secret: <CRON_SECRET>
```

## Authentication & Roles

Portl uses Supabase Auth for sign-up/login (password, email OTP, and forgot-password reset). Every account has a `role` (`resident`, `guard`, or `admin`) on `profiles`, plus optional committee permissions. RLS policies scope data to the signed-in user's society. On first launch, users create a society (admin) or join via invite code.

Forgot password: **Login → Forgot password?** → email link → **Choose a new password**.

## Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm test` | Run Jest unit + RTL tests |
| `npm run typecheck` | Typecheck the Expo app |
| `npm run typecheck:functions` | Deno-check Edge Functions (optional) |
| `npm run lint` | Run ESLint (app + Edge Functions) |
| `npm run android` | Build and run on Android (dev client) |
| `npm run ios` | Build and run on iOS simulator |

## License

This project is provided as-is for personal and educational use.
