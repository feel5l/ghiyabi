-- =============================================================
-- Ghiyabi — Default admin account (run once per Supabase project)
-- =============================================================
-- Login uses Supabase Auth (email + password), NOT the admins table alone.
-- The admins table only grants the "admin" role after Auth succeeds.
--
-- Default credentials (test / E2E):
--   Email:    admin@school.test
--   Password: set at runtime via app.admin_password (see below)
--
-- 1) Register the admin row (role):
INSERT INTO admins (email) VALUES ('admin@school.test')
ON CONFLICT (email) DO NOTHING;

-- 2) Create or reset the Auth user (run in SQL Editor with sufficient privileges):
--    If the user does not exist yet, create via Dashboard:
--    Authentication → Users → Add user → Email + Password, Auto-confirm.
--
--    To reset password for an existing user:
--    SELECT set_config('app.admin_password', 'YOUR-STRONG-PASSWORD', false);
--    (Run the UPDATE right after setting app.admin_password in the same SQL session.)
UPDATE auth.users
SET
  encrypted_password = extensions.crypt(current_setting('app.admin_password', true), extensions.gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE email = 'admin@school.test'
  AND COALESCE(current_setting('app.admin_password', true), '') <> '';

-- Production: replace admin@school.test with your real admin email in both
-- auth.users and public.admins, and use a strong unique password.
