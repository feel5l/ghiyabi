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

# Set edge function secrets
supabase secrets set RESEND_API_KEY=your-resend-api-key

# Deploy the function
supabase functions deploy notify-absent
```

After deploying, set up the Database Webhook in Supabase:
1. Go to **Database → Webhooks → Create new webhook**
2. Table: `attendance_log`
3. Events: `INSERT`, `UPDATE`
4. Webhook URL: `https://your-project.supabase.co/functions/v1/notify-absent`
5. HTTP headers: Add `Authorization: Bearer your-anon-key`

### 7. Push to GitHub

1. In Replit, open the **Git** tab (left sidebar)
2. Click **Connect to GitHub**
3. Create a new repository named `ghiyabi`
4. Click **Push to GitHub**

### 8. Deploy to Netlify

1. Go to [netlify.com](https://netlify.com) → **New site** → **Import from GitHub**
2. Select the `ghiyabi` repository
3. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist/public`
4. Click **Add environment variables** and add:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key
5. Click **Deploy site**

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

## License

MIT
