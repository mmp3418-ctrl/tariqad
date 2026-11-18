"use client";

import {
  FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  ExternalLink,
  Eye,
  EyeOff,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Save,
  Send,
  Settings2,
  Share2,
  Trash2,
} from "lucide-react";
import {
  getSiteSettings,
  saveSiteSettings,
} from "@/app/admin/settings/actions";
import {
  defaultSettings,
  readLocalSettings,
  writeLocalSettings,
} from "@/lib/settings-local";
import {
  isValidEmail,
  isValidMapsUrl,
  normalizeSocialUrl,
  safeExternalHref,
  SOCIAL_ICON_OPTIONS,
  toMailtoLink,
  toTelegramLink,
  toTelLink,
  toWhatsAppLink,
  validateSocialUrl,
} from "@/lib/social";
import type { SiteSettings, SocialIconKey, SocialLink } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { SocialIcon } from "@/components/ui/social-icon";
import { useToast } from "@/components/ui/toast";

const emptyLinkForm = {
  platform: "",
  label: "",
  url: "",
  icon: "globe" as SocialIconKey,
  is_visible: true,
};

type ContactForm = {
  phone_number: string;
  whatsapp_number: string;
  telegram_link: string;
  email: string;
  location_text: string;
  maps_url: string;
  hero_subtitle_ar: string;
  book_year_label: string;
};

const emptyContact = (): ContactForm => ({
  phone_number: "",
  whatsapp_number: "",
  telegram_link: "",
  email: "",
  location_text: "",
  maps_url: "",
  hero_subtitle_ar: "",
  book_year_label: "",
});

function fromSettings(data: SiteSettings): ContactForm {
  return {
    phone_number: data.phone_number ?? "",
    whatsapp_number: data.whatsapp_number ?? "",
    telegram_link: data.telegram_link ?? "",
    email: data.email ?? "",
    location_text: data.location_text ?? "",
    maps_url: data.maps_url ?? "",
    hero_subtitle_ar: data.hero_subtitle_ar ?? "",
    book_year_label: data.book_year_label ?? "",
  };
}

export function SettingsManager() {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [usingLocal, setUsingLocal] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings());
  const [contact, setContact] = useState<ContactForm>(emptyContact());
  const [formError, setFormError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<SocialLink | null>(null);
  const [linkForm, setLinkForm] = useState(emptyLinkForm);
  const [linkError, setLinkError] = useState<string | null>(null);

  const visibleCount = useMemo(
    () => settings.social_links.filter((l) => l.is_visible).length,
    [settings.social_links]
  );

  const emailPreview = contact.email.trim()
    ? toMailtoLink(contact.email)
    : null;
  const phonePreview = contact.phone_number.trim()
    ? toTelLink(contact.phone_number)
    : null;
  const waPreview = contact.whatsapp_number.trim()
    ? toWhatsAppLink(contact.whatsapp_number)
    : null;
  const tgPreview = contact.telegram_link.trim()
    ? toTelegramLink(contact.telegram_link)
    : null;
  const mapsPreview = safeExternalHref(contact.maps_url);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getSiteSettings();
    if (result.success && result.data) {
      setUsingLocal(false);
      setSettings(result.data);
      setContact(fromSettings(result.data));
    } else {
      if (result.success === false && result.error !== "NO_SUPABASE") {
        error(result.error);
      }
      const local = readLocalSettings();
      setUsingLocal(true);
      setSettings(local);
      setContact(fromSettings(local));
    }
    setLoading(false);
  }, [error]);

  useEffect(() => {
    void load();
  }, [load]);

  function persist(next: SiteSettings, message?: string) {
    startTransition(async () => {
      if (usingLocal) {
        writeLocalSettings(next);
        setSettings(next);
        setContact(fromSettings(next));
        success(message ?? "تم الحفظ محلياً");
        return;
      }

      const result = await saveSiteSettings({
        phone_number: next.phone_number ?? "",
        whatsapp_number: next.whatsapp_number ?? "",
        telegram_link: next.telegram_link ?? "",
        email: next.email ?? "",
        location_text: next.location_text ?? "",
        maps_url: next.maps_url ?? "",
        hero_subtitle_ar: next.hero_subtitle_ar ?? "",
        book_year_label: next.book_year_label ?? "",
        social_links: next.social_links,
      });

      if (result.success && result.data) {
        setSettings(result.data);
        setContact(fromSettings(result.data));
        success(result.message ?? "تم الحفظ بنجاح");
      } else if (!result.success) {
        if (result.error === "NO_SUPABASE") {
          writeLocalSettings(next);
          setUsingLocal(true);
          setSettings(next);
          setContact(fromSettings(next));
          success("تم الحفظ محلياً (Supabase غير متصل)");
        } else {
          error(result.error);
        }
      }
    });
  }

  function handleSaveContact(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (contact.email.trim() && !isValidEmail(contact.email)) {
      setFormError("صيغة البريد الإلكتروني غير صحيحة");
      return;
    }
    if (contact.maps_url.trim() && !isValidMapsUrl(contact.maps_url.trim())) {
      setFormError(
        "رابط الخريطة غير صالح — استخدم رابط Google Maps أو خرائط أخرى بصيغة https://"
      );
      return;
    }

    const next: SiteSettings = {
      ...settings,
      phone_number: contact.phone_number.trim() || null,
      whatsapp_number: contact.whatsapp_number.trim() || null,
      telegram_link: contact.telegram_link.trim() || null,
      email: contact.email.trim() || null,
      location_text: contact.location_text.trim() || null,
      maps_url: contact.maps_url.trim() || null,
      hero_subtitle_ar: contact.hero_subtitle_ar.trim() || null,
      book_year_label: contact.book_year_label.trim() || null,
    };
    persist(next, "تم حفظ بيانات التواصل والموقع");
  }

  function openCreateLink() {
    setEditing(null);
    setLinkForm(emptyLinkForm);
    setLinkError(null);
    setModalOpen(true);
  }

  function openEditLink(link: SocialLink) {
    setEditing(link);
    setLinkForm({
      platform: link.platform,
      label: link.label,
      url: link.url,
      icon: link.icon,
      is_visible: link.is_visible,
    });
    setLinkError(null);
    setModalOpen(true);
  }

  function handleSaveLink(e: FormEvent) {
    e.preventDefault();
    const validation = validateSocialUrl(linkForm.icon, linkForm.url);
    if (validation) {
      setLinkError(validation);
      return;
    }
    if (!linkForm.label.trim() && !linkForm.platform.trim()) {
      setLinkError("اسم المنصة أو التسمية مطلوب");
      return;
    }

    const normalizedUrl = normalizeSocialUrl(linkForm.icon, linkForm.url);
    if (!safeExternalHref(normalizedUrl)) {
      setLinkError("الرابط يجب أن يكون خارجياً بصيغة https:// أو tel: أو mailto:");
      return;
    }

    const item: SocialLink = {
      id: editing?.id ?? crypto.randomUUID(),
      platform: linkForm.platform.trim() || linkForm.label.trim(),
      label: linkForm.label.trim() || linkForm.platform.trim(),
      url: normalizedUrl,
      icon: linkForm.icon,
      is_visible: linkForm.is_visible,
    };

    const social_links = editing
      ? settings.social_links.map((l) => (l.id === editing.id ? item : l))
      : [...settings.social_links, item];

    setModalOpen(false);
    persist(
      { ...settings, social_links },
      editing ? "تم تحديث الرابط" : "تم إضافة الرابط"
    );
  }

  function toggleVisibility(id: string, is_visible: boolean) {
    const social_links = settings.social_links.map((l) =>
      l.id === id ? { ...l, is_visible } : l
    );
    persist(
      { ...settings, social_links },
      is_visible ? "تم إظهار الرابط" : "تم إخفاء الرابط"
    );
  }

  function confirmDelete() {
    if (!deleteId) return;
    const social_links = settings.social_links.filter((l) => l.id !== deleteId);
    setDeleteId(null);
    persist({ ...settings, social_links }, "تم حذف الرابط");
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-600 dark:text-slate-400">
        جاري تحميل الإعدادات...
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-teal-700 dark:text-teal-300">
            <Settings2 className="h-5 w-5" />
            <span className="text-sm font-semibold">إعدادات الموقع</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            التواصل والموقع والقنوات
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            إدارة ديناميكية بالكامل للبريد والموقع الجغرافي ووسائل التواصل —
            بدون أي بيانات ثابتة
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          قنوات ظاهرة:{" "}
          <span className="font-bold text-teal-700 dark:text-teal-300">
            {visibleCount}
          </span>
        </div>
      </header>

      {usingLocal ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          التخزين المحلي مفعّل مؤقتاً. اربط Supabase عبر `.env.local` ونفّذ
          `supabase/schema.sql` للمزامنة السحابية.
        </div>
      ) : null}

      <form onSubmit={handleSaveContact} className="space-y-4">
        {/* Card 1 — Official contact & email */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              <Phone className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                التواصل الرسمي والبريد
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                الهاتف، واتساب، تيليجرام، والبريد الإلكتروني الرسمي
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="الهواتف"
              value={contact.phone_number}
              onChange={(v) => setContact((c) => ({ ...c, phone_number: v }))}
              placeholder="مثال: +2189xxxxxxxx"
              hint={phonePreview ? `معاينة الاتصال: ${phonePreview}` : undefined}
              previewHref={safeExternalHref(phonePreview ?? "")}
            />
            <Field
              label="البريد الإلكتروني الرسمي"
              type="email"
              value={contact.email}
              onChange={(v) => setContact((c) => ({ ...c, email: v }))}
              placeholder="info@example.com"
              hint={emailPreview ? `معاينة: ${emailPreview}` : undefined}
              previewHref={safeExternalHref(emailPreview ?? "")}
              icon={<Mail className="h-4 w-4" />}
            />
            <Field
              label="واتساب"
              value={contact.whatsapp_number}
              onChange={(v) =>
                setContact((c) => ({ ...c, whatsapp_number: v }))
              }
              placeholder="رقم أو https://wa.me/..."
              hint={waPreview ? `معاينة: ${waPreview}` : undefined}
              previewHref={safeExternalHref(waPreview ?? "")}
              icon={<MessageCircle className="h-4 w-4" />}
            />
            <Field
              label="تيليجرام"
              value={contact.telegram_link}
              onChange={(v) =>
                setContact((c) => ({ ...c, telegram_link: v }))
              }
              placeholder="@channel أو https://t.me/..."
              hint={tgPreview ? `معاينة: ${tgPreview}` : undefined}
              previewHref={safeExternalHref(tgPreview ?? "")}
              icon={<Send className="h-4 w-4" />}
            />
          </div>
        </section>

        {/* Card 2 — Location & maps */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                الموقع الجغرافي / اللوكيشن
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                عنوان نصي واضح + رابط مباشر لخرائط جوجل
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <Field
              label="العنوان النصي"
              value={contact.location_text}
              onChange={(v) =>
                setContact((c) => ({ ...c, location_text: v }))
              }
              placeholder="مثال: طرابلس، ليبيا — حي …"
            />
            <Field
              label="رابط خرائط جوجل"
              value={contact.maps_url}
              onChange={(v) => setContact((c) => ({ ...c, maps_url: v }))}
              placeholder="https://maps.google.com/..."
              hint={
                mapsPreview
                  ? "الرابط صالح — يمكن فتحه مباشرة"
                  : contact.maps_url
                    ? "تحقق من صيغة الرابط"
                    : undefined
              }
              previewHref={mapsPreview}
              icon={<ExternalLink className="h-4 w-4" />}
            />
          </div>
        </section>

        {/* Optional public copy */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            نصوص الواجهة العامة
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            اختيارية — تُعرض على المنصة التعريفية إن وُجدت
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="النص التعريفي (عربي)"
              value={contact.hero_subtitle_ar}
              onChange={(v) =>
                setContact((c) => ({ ...c, hero_subtitle_ar: v }))
              }
              placeholder="أدخل النص من لوحة التحكم"
            />
            <Field
              label="سنة الكتاب على الغلاف"
              value={contact.book_year_label}
              onChange={(v) =>
                setContact((c) => ({ ...c, book_year_label: v }))
              }
              placeholder="أدخل السنة يدوياً"
            />
          </div>
        </section>

        {formError ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-70"
        >
          <Save className="h-4 w-4" />
          حفظ التواصل والموقع
        </button>
      </form>

      {/* Card 3 — Social channels */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <Share2 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                قنوات وسائل التواصل
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                إضافة / تعديل / حذف مع أيقونة وإظهار/إخفاء لكل قناة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreateLink}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-3 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            <Plus className="h-4 w-4" />
            إضافة قناة
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {settings.social_links.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
              لا توجد قنوات بعد — أضف أول منصة اجتماعية من هنا
            </div>
          ) : (
            settings.social_links.map((link) => {
              const href = safeExternalHref(link.url);
              return (
                <article
                  key={link.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-teal-200 dark:border-slate-800 dark:hover:border-teal-900 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                      <SocialIcon name={link.icon} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                        {link.label}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {link.platform} · {link.icon}
                      </p>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs font-medium text-teal-700 hover:underline dark:text-teal-300"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{link.url}</span>
                        </a>
                      ) : (
                        <span className="mt-1 block truncate text-xs text-rose-600">
                          رابط غير صالح — عدّله
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Switch
                      checked={link.is_visible}
                      onChange={(v) => toggleVisibility(link.id, v)}
                      label={link.is_visible ? "ظاهر" : "مخفي"}
                      disabled={pending}
                    />
                    <button
                      type="button"
                      onClick={() => openEditLink(link)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      aria-label="تعديل"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(link.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      aria-label="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل قناة تواصل" : "إضافة قناة تواصل"}
      >
        <form onSubmit={handleSaveLink} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              الأيقونة
            </span>
            <select
              value={linkForm.icon}
              onChange={(e) =>
                setLinkForm((f) => ({
                  ...f,
                  icon: e.target.value as SocialIconKey,
                }))
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {SOCIAL_ICON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <SocialIcon name={linkForm.icon} />
              معاينة الأيقونة على المنصة التعريفية
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              اسم المنصة
            </span>
            <input
              value={linkForm.platform}
              onChange={(e) =>
                setLinkForm((f) => ({ ...f, platform: e.target.value }))
              }
              placeholder="Facebook"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              التسمية المعروضة
            </span>
            <input
              value={linkForm.label}
              onChange={(e) =>
                setLinkForm((f) => ({ ...f, label: e.target.value }))
              }
              placeholder="صفحتنا على فيسبوك"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              الرابط / الرقم
            </span>
            <input
              value={linkForm.url}
              onChange={(e) =>
                setLinkForm((f) => ({ ...f, url: e.target.value }))
              }
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              required
            />
          </label>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              {linkForm.is_visible ? (
                <Eye className="h-4 w-4 text-teal-700" />
              ) : (
                <EyeOff className="h-4 w-4 text-slate-400" />
              )}
              إظهار على الموقع العام
            </div>
            <Switch
              checked={linkForm.is_visible}
              onChange={(v) => setLinkForm((f) => ({ ...f, is_visible: v }))}
            />
          </div>

          {linkError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              {linkError}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="h-10 rounded-xl px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              حفظ
            </button>
          </div>
        </form>
      </Modal>

      {deleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="إلغاء"
            onClick={() => setDeleteId(null)}
          />
          <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              حذف القناة
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              هل أنت متأكد من حذف قناة التواصل؟ لن تظهر بعد ذلك على المنصة
              التعريفية.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="h-10 rounded-xl px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={pending}
                className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  icon,
  type = "text",
  previewHref,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  icon?: ReactNode;
  type?: string;
  previewHref?: string | null;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
        {icon}
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      {hint ? (
        <span className="flex items-center gap-2 truncate text-xs text-slate-500 dark:text-slate-400">
          <span className="truncate">{hint}</span>
          {previewHref ? (
            <a
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 font-medium text-teal-700 hover:underline dark:text-teal-300"
              onClick={(e) => e.stopPropagation()}
            >
              فتح
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}
