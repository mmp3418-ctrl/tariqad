# لوحة تحكم منصة طارق (tariq-admin)

لوحة إدارة عربية RTL متجاوبة بالكامل — Next.js App Router + Supabase.

## التشغيل

1. عبّئ `.env.local` بمفاتيح Supabase.
2. نفّذ `supabase/schema.sql` في SQL Editor.
3. أنشئ bucket عام باسم `platform-assets` في Storage.
4. `npm install && npm run dev`

## الدخول

- جدول `admin_users` (username / password / role)
- احتياطي عند تعذر قاعدة البيانات: `admin` / `tariq2026`

## الوحدات

| المسار | الوظيفة |
|--------|---------|
| `/login` | دخول باسم مستخدم + كلمة مرور |
| `/announcements` | إعلانات مع معاينة وأنواع أولوية |
| `/grades` | صفوف + خيار قريباً |
| `/units` | وحدات ودروس لكل صف |
| `/notes` | مذكرات PDF (صف→وحدة→درس + تصنيف) |
| `/videos` | شروحات مرئية بنفس التصنيف |
| `/teacher-space` | مساحة المعلم |
| `/schedules` | جداول مع تفعيل/إيقاف فوري |
| `/users` | المشرفون والصلاحيات |
| `/settings` | شعار، Hero، سنة الكتاب، تواصل |

الاسم الثابت: **منصة طارق** / **Tariq Hub**
