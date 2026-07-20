# نشر وتشغيل Ghiyabi (Netlify + Supabase)

مرجع تنفيذي يكمّل التوثيق التقني في [`docs/TECHNICAL.md`](docs/TECHNICAL.md) (التقنيات، المفاتيح، مخطط قاعدة البيانات).

## 1) قاعدة البيانات (Supabase)

1. نفّذ بالترتيب في **SQL Editor**:
   - [`artifacts/ghiyabi/supabase/schema.sql`](artifacts/ghiyabi/supabase/schema.sql)
   - [`artifacts/ghiyabi/supabase/seed.sql`](artifacts/ghiyabi/supabase/seed.sql)
2. أنشئ مستخدمي **Auth** بحيث يطابق البريد:
   - جدول `public.admins` (المدير)
3. للمعلمين: أضف أرقام الجوال في جدول `public.teachers` مع `is_active = true` (الحقول المرتبطة بالحصص: `teacher_phone`).

## 2) مصادقة الواجهة — إضافة عنوان Netlify (مهم)

في لوحة Supabase: **Authentication → URL Configuration**

- **Site URL:** `https://<اسم-الموقع>.netlify.app` (أو النطاق المخصص).
- **Redirect URLs:** أضف نفس العنوان وأي مسارات callback التي يستخدمها التطبيق (مثل تسجيل الدخول بـ Google إن وُجد).

بدون هذه الخطوة قد يفشل إعادة التوجيه بعد تسجيل الدخول في الإنتاج.

## 3) Netlify — المتغيرات البيئية

في **Site settings → Environment variables** أضف (للبناء والواجهة):

| المتغير | المصدر |
|--------|--------|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon (أو publishable) |

**ربط المستودع:** جذر المونوريبو (حيث يوجد [`netlify.toml`](netlify.toml)). **Base directory** فارغ.

## 4) دوال الحافة (Edge Functions) والأسرار

انشر من الجهاز أو عبر GitHub Actions (انظر `.github/workflows/deploy-supabase-functions.yml`).

### `notify-absent` (بريد عبر Resend)

في **Supabase → Edge Functions → Secrets** للدالة أو على مستوى المشروع:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NOTIFY_WEBHOOK_SECRET` (اختياري؛ إن وُجد يجب إرسال `Authorization: Bearer <القيمة>` من الـ webhook/trigger)

### `notify-whatsapp` (قالب Meta)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_GRAPH_API_VERSION` (اختياري، مثل `v21.0`)
- `NOTIFY_WEBHOOK_SECRET` (اختياري، نفس المنطق)

اعتماد قالب واتساب `absent_notification` بالعربية مع **أربعة** حقول نصية كما في الكود.

## 5) تفعيل الإشعار من `attendance_log`

بعد تطبيق الهجرات على قاعدة البيانات، يجب أن يوجد (أو يُنشأ) ما يلي:

- Trigger **`trg_notify_whatsapp_on_attendance`** → يستدعي الدالة `notify-whatsapp`.
- Trigger **`trg_notify_absent_email`** → يستدعي الدالة `notify-absent`.

كلاهما يعمل بعد `INSERT` أو `UPDATE` على `status` عندما تكون القيمة `Absent`، ويستخدم `pg_net` لإرسال `POST` JSON بنفس شكل حمولة Database Webhook.

إن رغبت بمفتاح مشترك للرأس `Authorization`، اضبط في Postgres (إن كان مسموحًا في خطتك):

```sql
-- مثال: يعتمد على صلاحيات المشروع؛ قد تحتاج لوحة Supabase أو دعمًا لضبط الإعدادات.
-- SELECT set_config('app.settings.notify_webhook_secret', 'your-secret', false);
```

أو استخدم **Database Webhooks** من لوحة Supabase بدل الاعتماد على الـ trigger.

## 6) GitHub Actions (نشر الدوال)

أضف في المستودع تحت **Settings → Secrets → Actions**:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF` (مثل `nbaveoeouirzniqanziw`)
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` (لخطوة `secrets set` في الـ workflow)
- `NOTIFY_WEBHOOK_SECRET`, `WHATSAPP_GRAPH_API_VERSION` (اختياري)
- `RESEND_API_KEY` (لتعيين سر البريد عبر الـ workflow إن رغبت)

ثم شغّل workflow **Deploy Supabase Edge Functions**.

## 7) تحقق سريع بعد النشر

1. فتح موقع Netlify → تسجيل دخول.
2. تسجيل حضور بحالة **غائب** لطالب له `parent_email` و/أو `parent_phone` صالح.
3. مراجعة **Supabase → Edge Functions → Logs** عند الفشل.
