-- =============================================================
-- Ghiyabi (غيابي) — Seed Data
-- =============================================================
-- Run this AFTER schema.sql
-- Inserts all 12 classes and 5+ sample students per class

-- Admin role (email must match a Supabase Auth user — see seed_admin_auth.sql)
INSERT INTO admins (email) VALUES
  ('admin@school.test')
ON CONFLICT (email) DO NOTHING;

-- =============================================================
-- 1. CLASSES
-- =============================================================

-- Grade 3 (4 classes)
INSERT INTO classes (id, name, grade_level, teacher_email) VALUES
  ('00000000-0000-0000-0000-000000000001', '3-A', 'Grade 3', 'teacher3a@school.edu'),
  ('00000000-0000-0000-0000-000000000002', '3-B', 'Grade 3', 'teacher3b@school.edu'),
  ('00000000-0000-0000-0000-000000000003', '3-C', 'Grade 3', 'teacher3c@school.edu'),
  ('00000000-0000-0000-0000-000000000004', '3-D', 'Grade 3', 'teacher3d@school.edu')
ON CONFLICT DO NOTHING;

-- Grade 4 (3 classes)
INSERT INTO classes (id, name, grade_level, teacher_email) VALUES
  ('00000000-0000-0000-0000-000000000005', '4-A', 'Grade 4', 'teacher4a@school.edu'),
  ('00000000-0000-0000-0000-000000000006', '4-B', 'Grade 4', 'teacher4b@school.edu'),
  ('00000000-0000-0000-0000-000000000007', '4-C', 'Grade 4', 'teacher4c@school.edu')
ON CONFLICT DO NOTHING;

-- Grade 5 (3 classes)
INSERT INTO classes (id, name, grade_level, teacher_email) VALUES
  ('00000000-0000-0000-0000-000000000008', '5-A', 'Grade 5', 'teacher5a@school.edu'),
  ('00000000-0000-0000-0000-000000000009', '5-B', 'Grade 5', 'teacher5b@school.edu'),
  ('00000000-0000-0000-0000-000000000010', '5-C', 'Grade 5', 'teacher5c@school.edu')
ON CONFLICT DO NOTHING;

-- Grade 6 (2 classes)
INSERT INTO classes (id, name, grade_level, teacher_email) VALUES
  ('00000000-0000-0000-0000-000000000011', '6-A', 'Grade 6', 'teacher6a@school.edu'),
  ('00000000-0000-0000-0000-000000000012', '6-B', 'Grade 6', 'teacher6b@school.edu')
ON CONFLICT DO NOTHING;

-- =============================================================
-- 2. STUDENTS (5 per class = 60 total)
-- =============================================================

-- Grade 3 - A
INSERT INTO students (full_name, class_id, parent_email, parent_phone) VALUES
  ('أحمد محمد العمري', '00000000-0000-0000-0000-000000000001', 'parent1a@example.com', '0501111001'),
  ('فاطمة علي الغامدي', '00000000-0000-0000-0000-000000000001', 'parent2a@example.com', '0501111002'),
  ('محمد سعد القحطاني', '00000000-0000-0000-0000-000000000001', 'parent3a@example.com', '0501111003'),
  ('نورة خالد الزهراني', '00000000-0000-0000-0000-000000000001', 'parent4a@example.com', '0501111004'),
  ('عبدالله عمر الحربي', '00000000-0000-0000-0000-000000000001', 'parent5a@example.com', '0501111005');

-- Grade 3 - B
INSERT INTO students (full_name, class_id, parent_email, parent_phone) VALUES
  ('ريم إبراهيم السلمي', '00000000-0000-0000-0000-000000000002', 'parent1b@example.com', '0502221001'),
  ('يوسف ناصر الدوسري', '00000000-0000-0000-0000-000000000002', 'parent2b@example.com', '0502221002'),
  ('سارة عبدالرحمن المطيري', '00000000-0000-0000-0000-000000000002', 'parent3b@example.com', '0502221003'),
  ('عمر جابر العتيبي', '00000000-0000-0000-0000-000000000002', 'parent4b@example.com', '0502221004'),
  ('حصة فهد البلوي', '00000000-0000-0000-0000-000000000002', 'parent5b@example.com', '0502221005');

-- Grade 3 - C
INSERT INTO students (full_name, class_id, parent_email, parent_phone) VALUES
  ('خالد سليمان الشمري', '00000000-0000-0000-0000-000000000003', 'parent1c@example.com', '0503331001'),
  ('منى راشد العنزي', '00000000-0000-0000-0000-000000000003', 'parent2c@example.com', '0503331002'),
  ('بدر محمد الرشيدي', '00000000-0000-0000-0000-000000000003', 'parent3c@example.com', '0503331003'),
  ('رنا عبدالله الجهني', '00000000-0000-0000-0000-000000000003', 'parent4c@example.com', '0503331004'),
  ('وليد أحمد البقمي', '00000000-0000-0000-0000-000000000003', 'parent5c@example.com', '0503331005');

-- Grade 3 - D
INSERT INTO students (full_name, class_id, parent_email, parent_phone) VALUES
  ('دانة سعود الزيد', '00000000-0000-0000-0000-000000000004', 'parent1d@example.com', '0504441001'),
  ('طارق عبدالعزيز الحسين', '00000000-0000-0000-0000-000000000004', 'parent2d@example.com', '0504441002'),
  ('إيمان محمد المرزوقي', '00000000-0000-0000-0000-000000000004', 'parent3d@example.com', '0504441003'),
  ('راشد فيصل السبيعي', '00000000-0000-0000-0000-000000000004', 'parent4d@example.com', '0504441004'),
  ('شيماء خالد الغامدي', '00000000-0000-0000-0000-000000000004', 'parent5d@example.com', '0504441005');

-- Grade 4 - A
INSERT INTO students (full_name, class_id, parent_email, parent_phone) VALUES
  ('عبدالرحمن علي القرني', '00000000-0000-0000-0000-000000000005', 'parent1e@example.com', '0505551001'),
  ('لولوة محمد الدهيم', '00000000-0000-0000-0000-000000000005', 'parent2e@example.com', '0505551002'),
  ('سلطان أحمد الحازمي', '00000000-0000-0000-0000-000000000005', 'parent3e@example.com', '0505551003'),
  ('غدير ناصر المسفر', '00000000-0000-0000-0000-000000000005', 'parent4e@example.com', '0505551004'),
  ('مشاري سعد الغانم', '00000000-0000-0000-0000-000000000005', 'parent5e@example.com', '0505551005');

-- Grade 4 - B
INSERT INTO students (full_name, class_id, parent_email, parent_phone) VALUES
  ('جود عبدالله الطريف', '00000000-0000-0000-0000-000000000006', 'parent1f@example.com', '0506661001'),
  ('نواف خالد العجمي', '00000000-0000-0000-0000-000000000006', 'parent2f@example.com', '0506661002'),
  ('ملك فهد الملحم', '00000000-0000-0000-0000-000000000006', 'parent3f@example.com', '0506661003'),
  ('حمود سليمان الربيعة', '00000000-0000-0000-0000-000000000006', 'parent4f@example.com', '0506661004'),
  ('تالا عمر الحميد', '00000000-0000-0000-0000-000000000006', 'parent5f@example.com', '0506661005');

-- Grade 4 - C
INSERT INTO students (full_name, class_id, parent_email, parent_phone) VALUES
  ('فيصل محمد العريفي', '00000000-0000-0000-0000-000000000007', 'parent1g@example.com', '0507771001'),
  ('ريان علي الخالدي', '00000000-0000-0000-0000-000000000007', 'parent2g@example.com', '0507771002'),
  ('عائشة سعد الحسن', '00000000-0000-0000-0000-000000000007', 'parent3g@example.com', '0507771003'),
  ('زياد ناصر العصيمي', '00000000-0000-0000-0000-000000000007', 'parent4g@example.com', '0507771004'),
  ('سمر عبدالرحمن القاسم', '00000000-0000-0000-0000-000000000007', 'parent5g@example.com', '0507771005');

-- Grade 5 - A
INSERT INTO students (full_name, class_id, parent_email, parent_phone) VALUES
  ('محمد إبراهيم الهاجري', '00000000-0000-0000-0000-000000000008', 'parent1h@example.com', '0508881001'),
  ('نادية خالد المنصور', '00000000-0000-0000-0000-000000000008', 'parent2h@example.com', '0508881002'),
  ('أنس عبدالله الشهري', '00000000-0000-0000-0000-000000000008', 'parent3h@example.com', '0508881003'),
  ('أريج سلطان اليامي', '00000000-0000-0000-0000-000000000008', 'parent4h@example.com', '0508881004'),
  ('ماجد فهد الرويس', '00000000-0000-0000-0000-000000000008', 'parent5h@example.com', '0508881005');

-- Grade 5 - B
INSERT INTO students (full_name, class_id, parent_email, parent_phone) VALUES
  ('رهف علي الزامل', '00000000-0000-0000-0000-000000000009', 'parent1i@example.com', '0509991001'),
  ('عبدالعزيز محمد السلطان', '00000000-0000-0000-0000-000000000009', 'parent2i@example.com', '0509991002'),
  ('جنى خالد المحيميد', '00000000-0000-0000-0000-000000000009', 'parent3i@example.com', '0509991003'),
  ('يحيى سعود البراك', '00000000-0000-0000-0000-000000000009', 'parent4i@example.com', '0509991004'),
  ('صوف عبدالله الوهيبي', '00000000-0000-0000-0000-000000000009', 'parent5i@example.com', '0509991005');

-- Grade 5 - C
INSERT INTO students (full_name, class_id, parent_email, parent_phone) VALUES
  ('باسم محمد الفيفي', '00000000-0000-0000-0000-000000000010', 'parent1j@example.com', '0501112001'),
  ('علياء ناصر الموسى', '00000000-0000-0000-0000-000000000010', 'parent2j@example.com', '0501112002'),
  ('سلمان أحمد النعيم', '00000000-0000-0000-0000-000000000010', 'parent3j@example.com', '0501112003'),
  ('ولاء فهد المعيقل', '00000000-0000-0000-0000-000000000010', 'parent4j@example.com', '0501112004'),
  ('حارث عبدالله الحمود', '00000000-0000-0000-0000-000000000010', 'parent5j@example.com', '0501112005');

-- Grade 6 - A
INSERT INTO students (full_name, class_id, parent_email, parent_phone) VALUES
  ('لانا خالد السواط', '00000000-0000-0000-0000-000000000011', 'parent1k@example.com', '0501113001'),
  ('عبدالمجيد محمد الجار الله', '00000000-0000-0000-0000-000000000011', 'parent2k@example.com', '0501113002'),
  ('شيوخ سعد الغامدي', '00000000-0000-0000-0000-000000000011', 'parent3k@example.com', '0501113003'),
  ('يزيد علي الزهراني', '00000000-0000-0000-0000-000000000011', 'parent4k@example.com', '0501113004'),
  ('ورود عبدالرحمن الدوسري', '00000000-0000-0000-0000-000000000011', 'parent5k@example.com', '0501113005');

-- Grade 6 - B
INSERT INTO students (full_name, class_id, parent_email, parent_phone) VALUES
  ('خالد سعود القرشي', '00000000-0000-0000-0000-000000000012', 'parent1l@example.com', '0501114001'),
  ('هيا محمد العلي', '00000000-0000-0000-0000-000000000012', 'parent2l@example.com', '0501114002'),
  ('بشار ناصر الحمدان', '00000000-0000-0000-0000-000000000012', 'parent3l@example.com', '0501114003'),
  ('ديمة فهد الفرحان', '00000000-0000-0000-0000-000000000012', 'parent4l@example.com', '0501114004'),
  ('قيس عبدالله المالكي', '00000000-0000-0000-0000-000000000012', 'parent5l@example.com', '0501114005');

-- =============================================================
-- 3. SAMPLE SESSIONS (today's date - update as needed)
-- =============================================================

-- You can run this to add sessions for today:
-- UPDATE sessions SET date = CURRENT_DATE WHERE true;

-- Example sessions for testing (run separately if needed):
/*
INSERT INTO sessions (date, period, subject, class_id, teacher_email) VALUES
  (CURRENT_DATE, 'P1', 'الرياضيات', '00000000-0000-0000-0000-000000000001', 'teacher3a@school.edu'),
  (CURRENT_DATE, 'P2', 'اللغة العربية', '00000000-0000-0000-0000-000000000001', 'teacher3a@school.edu'),
  (CURRENT_DATE, 'P3', 'العلوم', '00000000-0000-0000-0000-000000000001', 'teacher3a@school.edu'),
  (CURRENT_DATE, 'P1', 'الرياضيات', '00000000-0000-0000-0000-000000000005', 'teacher4a@school.edu'),
  (CURRENT_DATE, 'P2', 'التربية الإسلامية', '00000000-0000-0000-0000-000000000005', 'teacher4a@school.edu');
*/
