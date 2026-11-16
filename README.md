# لوحة تحكم منصة طارق (tariq-admin)

لوحة إدارة عربية RTL مبنية بـ **Next.js App Router** و **Supabase** لإدارة الإعلانات، الصفوف، المذكرات، وجداول المعلمين.

## التشغيل السريع

1. انسخ المتغيرات البيئية:

```bash
cp .env.example .env.local
```

2. عبّئ القيم في `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ADMIN_PASSWORD`

3. نفّذ مخطط قاعدة البيانات من `supabase/schema.sql` داخل Supabase SQL Editor.

4. شغّل المشروع:

```bash
npm install
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000) وسجّل الدخول بكلمة `ADMIN_PASSWORD`.

## الوحدات

| المسار | الوظيفة |
|--------|---------|
| `/login` | دخول محمي بكلمة مرور المشرف (جلسة Cookie) |
| `/announcements` | CRUD الإعلانات + تفعيل/إيقاف |
| `/grades` | CRUD الصفوف + تعبئة المنهج الليبي الافتراضي |
| `/resources` | CRUD المذكرات/الشروحات مع فلتر الصف |
| `/schedules` | إدارة جداول المعلمين (شبكة أسبوعية + قائمة) |
| `/settings` | إعدادات الموقع: الشعار، التواصل، السوشيال |

## الأمان

- الجلسة تُخزَّن في cookie باسم `tariq_admin_session` (httpOnly).
- القيمة توقيع HMAC مشتق من `ADMIN_PASSWORD`.
- `middleware.ts` يحمي كل مسارات اللوحة ويعيد التوجيه لـ `/login`.

## البنية

```
app/
  login/                 # صفحة الدخول + Server Actions
  (dashboard)/           # الصفحات المحمية
lib/
  supabase.ts            # عميل Supabase
  auth.ts                # جلسات المشرف
  types.ts               # أنواع الجداول
  constants.ts           # تسميات + بذرة المنهج الليبي
components/              # واجهات الوحدات ومكوّنات UI
supabase/schema.sql      # مخطط الجداول والسياسات
```
