# غيابي — Ghiyabi

**نظام تسجيل الحضور والغياب لمدرسة زيد بن ثابت الابتدائية**

A school attendance tracking system built with React + Vite + Supabase.

---

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Email**: Resend API (via Supabase Edge Function)
- **Hosting**: Netlify (static frontend)
- **Auth**: Supabase Auth (Google OAuth + email/password)

---

## Setup Guide

### Quick Start (Netlify deploy, ~5 minutes)

```bash
npm install -g netlify-cli
cp artifacts/ghiyabi/.env.example artifacts/ghiyabi/.env   # fill Supabase keys
pnpm install
pnpm run deploy:validate
netlify init
pnpm run fix:env
pnpm run deploy:production
```

Publish directory is **`artifacts/ghiyabi/dist/public`** (auto-detected via `pnpm run detect:publish`). Root `netlify.toml` already sets the monorepo build command.

---

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and click **Start your project**
2. Sign in with GitHub and create a new organization
3. Create a new project — choose a name and strong password
4. Wait for provisioning to complete (~2 minutes)

### 2. Run the Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Create a new query and paste the contents of `supabase/schema.sql`
3. Click **Run**
4. Then run `supabase/seed.sql` to insert the 12 classes and sample students

> **Note:** To add yourself as admin, update the email in `seed.sql`:
> ```sql
> INSERT INTO admins (email) VALUES ('your-email@example.com');
> ```

### 3. Set Up Google OAuth (optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
5. Copy Client ID and Client Secret
6. In Supabase: **Authentication → Providers → Google** — paste the credentials

> **After deploying to Netlify**, complete the extra step in [Post-Deployment: Enable Google Login](#post-deployment-enable-google-login) below.

### 4. Get Your API Keys

In Supabase dashboard → **Settings → API**:
- Copy **Project URL** → `VITE_SUPABASE_URL`
- Copy **anon / public** key → `VITE_SUPABASE_ANON_KEY`

Create a `.env` file in the project root (copy from `.env.example`):
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Test Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

### 6. Deploy the Supabase Edge Function

The edge function sends absence notification emails to parents.

**Requirements:** You need a [Resend](https://resend.com) account with an API key and a verified domain.

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Generate a strong random webhook secret (keep this private!)
openssl rand -base64 32
# Example output: aB3xK9mNpQrZ2wYuT7vL1sHjFdCeI4oG...

# Set edge function secrets (use the secret you generated above)
supabase secrets set RESEND_API_KEY=your-resend-api-key
supabase secrets set NOTIFY_WEBHOOK_SECRET=your-generated-secret-above

# Deploy the function
supabase functions deploy notify-absent
```

After deploying, set up the Database Webhook in Supabase:
1. Go to **Database → Webhooks → Create new webhook**
2. Table: `attendance_log`
3. Events: `INSERT`, `UPDATE`
4. Webhook URL: `https://your-project.supabase.co/functions/v1/notify-absent`
5. HTTP headers: Add `Authorization: Bearer your-generated-secret-above`

> **Security note:** The `NOTIFY_WEBHOOK_SECRET` is a private shared secret that protects this endpoint from unauthorized calls. Never use your Supabase anon key here — the anon key is public and would allow anyone to trigger email sends with forged data.

### 7. Push to GitHub

1. In Replit, open the **Git** tab (left sidebar)
2. Click **Connect to GitHub**
3. Create a new private repository (any name, e.g. `ghiyabi`)
4. Click **Push to GitHub**

> This pushes the full monorepo. The root `netlify.toml` is already configured to build just the Ghiyabi app.

### 8. Deploy to Netlify

**Option A — CLI (recommended)**

```bash
pnpm run predeploy:check    # Error: stops if .env keys missing
netlify init
pnpm run fix:env            # sync .env → Netlify
pnpm run deploy:production  # build + deploy
```

**Option B — Dashboard**

1. Go to [netlify.com](https://netlify.com) → **New site** → **Import from GitHub**
2. Select your repository
3. Build settings from root `netlify.toml` (verify with `pnpm run detect:publish`):
   - **Build command:** `pnpm install && pnpm --filter @workspace/ghiyabi run build`
   - **Publish directory:** `artifacts/ghiyabi/dist/public`
4. Add env vars (or run `pnpm run fix:env` after linking):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy site**

**If deploy fails**

| Problem | Recovery |
|---------|----------|
| `netlify env:list` error | `netlify login` → `netlify link` → `pnpm run fix:env` |
| Wrong publish folder | `pnpm run detect:publish` and match `netlify.toml` |
| Missing env on Netlify | `pnpm run fix:env` |

> SPA routing is handled by `[[redirects]]` in root `netlify.toml`. Security headers (CSP, X-Frame-Options) are in the same file.

---

## Pages

| Route | Role | Description |
|-------|------|-------------|
| `/login` | Everyone | Login with Google or email/password |
| `/teacher` | Teacher | Dashboard with today's sessions |
| `/teacher/session/:id` | Teacher | Mark attendance for a session |
| `/admin` | Admin | Dashboard with KPIs and stats |
| `/admin/students` | Admin | CRUD for student records |
| `/admin/classes` | Admin | CRUD for class records |

---

## Adding Sessions

Sessions (حصص) must be added by an admin or via SQL. Example:

```sql
INSERT INTO sessions (date, period, subject, class_id, teacher_email)
VALUES (
  CURRENT_DATE,
  'P1',
  'الرياضيات',
  '00000000-0000-0000-0000-000000000001',  -- class ID from classes table
  'teacher3a@school.edu'
);
```

Periods: `P1` through `P6`

---

## Project Structure

```
ghiyabi/
├── src/
│   ├── components/
│   │   ├── AttendanceRow.tsx   # Per-student status buttons
│   │   ├── SessionCard.tsx     # Teacher dashboard session card
│   │   ├── KpiCard.tsx         # Admin KPI metric card
│   │   ├── Skeleton.tsx        # Loading skeletons
│   │   └── ProtectedRoute.tsx  # Auth/role guard
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── TeacherDashboard.tsx
│   │   ├── SessionAttendance.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── Students.tsx
│   │   └── Classes.tsx
│   ├── lib/
│   │   └── supabase.ts         # Supabase client + types
│   ├── hooks/
│   │   └── useAuth.ts          # Auth state + role detection
│   ├── App.tsx                 # Router + protected routes
│   └── main.tsx
├── supabase/
│   ├── schema.sql              # DB tables + RLS policies
│   ├── seed.sql                # 12 classes + 60 sample students
│   └── functions/
│       └── notify-absent/
│           └── index.ts        # Edge function for email alerts
├── public/
│   └── _redirects              # Netlify SPA routing
├── netlify.toml                # Netlify build config
├── .env.example                # Required environment variables
└── README.md
```

---

## Post-Deployment: Enable Google Login

After your Netlify site is live, Google login will fail with a **redirect_uri_mismatch** error unless you complete these two configuration steps.

### Step 1 — Add your Netlify URL to Supabase

Supabase must whitelist the Netlify domain so it knows it is allowed to redirect users back there after Google login completes.

1. Open your [Supabase dashboard](https://supabase.com/dashboard) and select your project
2. Go to **Authentication → URL Configuration**
3. Under **Additional Redirect URLs**, add your Netlify site URL:
   ```
   https://your-site.netlify.app
   ```
   Replace `your-site` with your actual Netlify subdomain (e.g. `ghiyabi`).
4. Click **Save**

> If you set a custom domain on Netlify, add that too (e.g. `https://ghiyabi.example.com`).

### Step 2 — Verify the Supabase callback is in Google Cloud Console

The OAuth callback URL (`https://your-project.supabase.co/auth/v1/callback`) must be listed as an **Authorized redirect URI** in your Google OAuth client. This should already be set from Step 3 of the setup guide, but confirm it:

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, confirm this URL is present:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
   Replace `your-project` with your Supabase project reference (visible in your Supabase project URL).
4. If it is missing, click **Add URI**, paste it in, and click **Save**

> Changes in Google Cloud Console can take a few minutes to propagate.

### After both steps

Open your Netlify site, click **تسجيل الدخول بـ Google**, and you should be redirected to Google and back successfully. If you still see an error, double-check that the Supabase project ref and Netlify subdomain are spelled correctly in the URLs above.

---

## License

MIT
