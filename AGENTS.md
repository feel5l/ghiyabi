# AGENTS.md — دليل العمل على مشروع «غياب زيد» (Ghiyabi)

> **الغرض:** تمكين أي وكيل ذكاء اصطناعي (Cursor, Claude, Copilot, Codex, …) من فهم المشروع وتعديله ونشره دون تخمين.  
> **اللغة:** العربية للسياق التشغيلي؛ أسماء الملفات/الأوامر كما في المستودع.

---

## 0) هوية المشروع (ملخص في 30 ثانية)

| الحقل | القيمة |
|--------|--------|
| الاسم العربي | غياب زيد / غيابي |
| الاسم التقني | `@workspace/ghiyabi` |
| المدرسة | زيد بن ثابت الابتدائية |
| الوظيفة | تسجيل حضور وغياب الطلاب (معلم + مدير) |
| الواجهة | React 19 + Vite + TypeScript + Tailwind (RTL عربي) |
| الخلفية | Supabase (PostgreSQL + Auth + Edge Functions) |
| الاستضافة | Netlify (مخرجات ثابتة) |
| جذر التطبيق | `artifacts/ghiyabi/` |
| إعداد النشر | `netlify.toml` في **جذر المونوريبو** |

هذا المستودع **مونوريبو pnpm**. لا تنشر مجلد `artifacts/ghiyabi` وحده ما لم تُعدَّل مسارات البناء.

---

## 1) قواعد إلزامية للوكيل

1. **استخدم `pnpm` فقط** — لا `npm install` / لا `yarn` (يوجد `preinstall` يمنع غير pnpm).
2. **لا تضع أسراراً في Git** — لا `SERVICE_ROLE` ولا `RESEND_*` ولا توكن واتساب في ملفات الواجهة أو README.
3. **متغيرات الواجهة فقط** في `artifacts/ghiyabi/.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **مجلد النشر:** `artifacts/ghiyabi/dist/public` (وليس `dist` فقط).
5. **لا تغيّر سياسات RLS** دون مراجعة أمنية صريحة من المستخدم.
6. **التوثيق التقني التفصيلي:** اقرأ `docs/TECHNICAL.md` قبل تغيير المخطط أو المفاتيح.
7. **النشر التشغيلي:** اتبع `DEPLOYMENT.md`.
8. عند التعديل: غيّر أقل قدر ضروري من الملفات؛ لا تعِد كتابة unrelated code.
9. الردود للمستخدم النهائي بالعربية ما لم يطلب غير ذلك.
10. قبل اعتبار المهمة منتهية: `pnpm --filter @workspace/ghiyabi run typecheck` ويفضّل `build`.

---

## 2) خريطة المستودع

```
غياب زيد/                          ← جذر المونوريبو (افتحه في المحرر)
├── AGENTS.md                      ← هذا الملف (للوكلاء)
├── ابدأ_هنا.md                    ← بداية سريعة للبشر
├── README.md                      ← نظرة عامة
├── DEPLOYMENT.md                  ← نشر Netlify + Supabase
├── docs/TECHNICAL.md              ← تقنيات + مفاتيح + جداول DB
├── netlify.toml                   ← أمر البناء + publish + headers
├── package.json                   ← سكربتات الجذر (deploy:production)
├── pnpm-workspace.yaml
├── artifacts/
│   └── ghiyabi/                   ← تطبيق الحضور (المهم)
│       ├── .env.example
│       ├── package.json           ← name: @workspace/ghiyabi
│       ├── vite.config.ts         ← outDir = dist/public
│       ├── src/
│       │   ├── App.tsx            ← المسارات
│       │   ├── pages/             ← Login, Teacher*, Admin*
│       │   ├── hooks/useAuth.ts
│       │   ├── lib/supabase.ts
│       │   └── lib/exportAttendanceExcel.ts
│       └── supabase/
│           ├── schema.sql         ← مصدر الحقيقة للـ DB
│           ├── seed.sql
│           └── functions/
│               ├── notify-absent/
│               └── notify-whatsapp/
├── lib/                           ← مكتبات مشتركة للمونوريبو
└── scripts/
```

---

## 3) الأدوار والمصادقة (لا تخلط بينهما)

| الدور | كيف يدخل | أين يُعرَّف |
|------|-----------|-------------|
| **مدير** | بريد + كلمة مرور → Supabase Auth | `auth.users` + صف في `public.admins` |
| **معلم** | رقم جوال → تحقق من الجدول ثم جلسة واجهة | `public.teachers` (`phone`, `is_active`) |

- حقول الربط في الحصص/الفصول: **`teacher_phone`** (ليس `teacher_email` في المخطط الحالي).
- كلمة مرور المدير **ليست** في جدول `admins`.

---

## 4) قاعدة البيانات — الجداول الأساسية

مصدر الحقيقة: `artifacts/ghiyabi/supabase/schema.sql`

| جدول | الغرض |
|------|--------|
| `classes` | الفصول + `teacher_phone` |
| `students` | الطلاب + تواصل ولي الأمر |
| `sessions` | حصص يومية (`period` = P1…P6) |
| `attendance_log` | حضور: Present/Absent/Late/Excused |
| `admins` | بريد المديرين المصرّح لهم |
| `teachers` | معلمو الدخول بالجوال |
| `weekly_schedule` | قالب الجدول الأسبوعي |

**RLS مفعّل على الكل.** الدالة `is_admin()` تعتمد على `auth.email()` ∈ `admins`.

تطبيق المخطط: SQL Editor → `schema.sql` ثم `seed.sql`.

---

## 5) المفاتيح (أسماء فقط)

### واجهة (Netlify / `.env`)

| المتغير | أين |
|---------|-----|
| `VITE_SUPABASE_URL` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | نفس الصفحة (anon) |

### Edge Function Secrets (لوحة Supabase فقط)

| السر | الدالة |
|------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | notify-* |
| `RESEND_API_KEY` | notify-absent |
| `NOTIFY_WEBHOOK_SECRET` | اختياري للويبهوك |
| `WHATSAPP_ACCESS_TOKEN` | notify-whatsapp |
| `WHATSAPP_PHONE_NUMBER_ID` | notify-whatsapp |
| `WHATSAPP_GRAPH_API_VERSION` | اختياري |

---

## 6) أوامر يومية

```bash
# من جذر «غياب زيد»
corepack enable
pnpm install

cp artifacts/ghiyabi/.env.example artifacts/ghiyabi/.env
# حرّر .env ثم:

pnpm --filter @workspace/ghiyabi dev          # http://localhost:5173
pnpm --filter @workspace/ghiyabi run typecheck
pnpm --filter @workspace/ghiyabi run build    # → artifacts/ghiyabi/dist/public

# نشر (يتطلب تسجيل Netlify)
pnpm run deploy:production
```

### Netlify (مهم)

- **Base directory:** فارغ (جذر المونوريبو)
- **Build:** من `netlify.toml`
- **Publish:** `artifacts/ghiyabi/dist/public`
- أضف نفس متغيرات `VITE_*` في إعدادات الموقع

---

## 7) المسارات (UI)

| المسار | الدور |
|--------|------|
| `/login` | معلم (جوال) / مدير (بريد) |
| `/teacher` | حصص اليوم |
| `/teacher/session/:id` | تسجيل غياب |
| `/admin` | لوحة + رسوم + تصدير Excel |
| `/admin/teachers` | المعلمون |
| `/admin/students` | الطلاب |
| `/admin/classes` | الفصول |
| `/admin/sessions` | الحصص |
| `/admin/schedule` | الجدول الأسبوعي |
| `/admin/account` | حساب المدير |

---

## 8) مهام شائعة — أين تعدّل؟

| المهمة | ابدأ من |
|--------|---------|
| شاشة الدخول | `src/pages/Login.tsx`, `hooks/useAuth.ts` |
| تسجيل الحضور | `SessionAttendance.tsx`, `AttendanceRow.tsx` |
| لوحة المدير / رسوم / Excel | `AdminDashboard.tsx`, `lib/exportAttendanceExcel.ts` |
| مخطط DB | `supabase/schema.sql` ثم طبّقه على Supabase |
| بريد الغياب | `supabase/functions/notify-absent/` |
| واتساب | `supabase/functions/notify-whatsapp/` |
| إعدادات النشر | `netlify.toml`, `DEPLOYMENT.md` |

---

## 9) قائمة تحقق قبل PR / نشر

- [ ] لا أسرار في الملفات المضافة
- [ ] `typecheck` ناجح
- [ ] `build` ينتج `artifacts/ghiyabi/dist/public/index.html`
- [ ] إن تغيّر المخطط: حُدّث `docs/TECHNICAL.md`
- [ ] إن تغيّرت متغيرات البيئة: حُدّث `.env.example` + TECHNICAL + DEPLOYMENT
- [ ] واجهة عربية RTL ما زالت سليمة للمسارات المعدّلة

---

## 10) ما يجب تجنّبه

- تخمين `publish = "dist"` — خطأ شائع يكسر النشر.
- إضافة Google OAuth دون ضبط Redirect URLs في Supabase (إن أُعيد تفعيله).
- خلط نموذج `teacher_email` القديم مع `teacher_phone` الحالي.
- تشغيل أوامر هدم DB (`drop schema`) دون طلب صريح.
- الاعتماد على بيانات الاختبار (`admin@school.test`) في الإنتاج.

---

## 11) مصادر الحقيقة (بالأولوية)

1. `artifacts/ghiyabi/supabase/schema.sql`
2. `artifacts/ghiyabi/src/**` (سلوك الواجهة)
3. `docs/TECHNICAL.md`
4. `DEPLOYMENT.md`
5. هذا الملف `AGENTS.md`

إذا تعارض مصدران، **الكود + schema.sql يغلبان**؛ ثم صحّح الوثائق.

---

*نسخة حزمة سطح المكتب «غياب زيد» — جاهزة للتعديل والنشر مع أي وكيل.*
