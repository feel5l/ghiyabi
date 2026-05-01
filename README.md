# غيابي — Ghiyabi

A school attendance tracking system built for Zaid Bin Thabit Primary School. The name "غيابي" (Ghiyabi) means "my absence" in Arabic.

## What It Does

Ghiyabi is a digital attendance platform that allows teachers to record student attendance per class session and enables administrators to monitor attendance patterns across the school.

**Key features:**
- Teachers mark attendance (Present / Absent / Late / Excused) for each session
- Automated Arabic email notifications sent to parents when a student is absent
- Admin dashboard with school-wide KPIs: daily absences, high-absence classes, sessions not started
- Full CRUD management for students, classes, and sessions
- Role-based access control (Admin vs Teacher)
- Fully localized in Arabic with RTL layout

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, Radix UI |
| Routing | Wouter |
| Backend / BaaS | Supabase (PostgreSQL, Auth, Edge Functions) |
| Notifications | Resend API (Arabic email alerts) |
| Monorepo | pnpm workspaces |

## Project Structure

```
artifacts/
  ghiyabi/        # React frontend (Vite)
  api-server/     # API utility server
lib/              # Shared libraries
```

## Running Locally

### Prerequisites
- Node.js 20+
- pnpm 9+
- A Supabase project with the schema applied (see `artifacts/ghiyabi/supabase/schema.sql`)

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment template and fill in your values
cp artifacts/ghiyabi/.env.example artifacts/ghiyabi/.env
```

Required environment variables for the frontend (`artifacts/ghiyabi/.env`):

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Start development server

```bash
pnpm --filter @workspace/ghiyabi dev
```

The app will be available at `http://localhost:5173`.

## Database

The full PostgreSQL schema (tables, RLS policies, and helper functions) is located at:

```
artifacts/ghiyabi/supabase/schema.sql
```

Apply it to your Supabase project via the SQL editor or the Supabase CLI.

## Notifications

Absent-student email notifications are sent via a Supabase Edge Function located at:

```
artifacts/ghiyabi/supabase/functions/notify-absent/
```

Deploy it with:
```bash
supabase functions deploy notify-absent
```

Set the `RESEND_API_KEY` secret in your Supabase project for the function to send emails.

## WhatsApp Absent Notifications

### 1. Deploy the Edge Function

```bash
supabase functions deploy notify-whatsapp
```

### 2. Set Secrets

```bash
supabase secrets set WHATSAPP_TOKEN=your_token
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

### 3. WhatsApp Template

Create a template named `absent_notification` (language: `ar`) in your Meta Business account with 4 body parameters:

1. Student name
2. Date
3. Subject
4. Class name

### 4. Usage

- **Teacher view (SessionAttendance):** A green WhatsApp button appears next to each student marked as "Absent". Tap it to send an instant notification to the parent.
- **Admin view (AdminDashboard):** The "Absent Students Today" section lists all absent students with individual WhatsApp buttons and a "Send All" button to notify all parents at once.
