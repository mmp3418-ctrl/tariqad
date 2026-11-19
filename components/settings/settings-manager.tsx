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
  Plus,
  Save,
  Send,
  Settings2,
  Share2,
  Trash2,
} from "lucide-react";
import {
  createSocialLink,
  deleteSocialLink,
  getSettingsBundle,
  saveSiteSettings,
  toggleSocialLinkActive,
  updateSocialLink,
} from "@/app/admin/settings/actions";
import {
  isValidEmail,
  isValidMapsUrl,
  normalizeSocialUrl,
  safeExternalHref,
  SOCIAL_ICON_OPTIONS,
  toMailtoLink,
  toTelegramLink,
  toWhatsAppLink,
  validateSocialUrl,
} from "@/lib/social";
import type {
  SiteSettings,
  SocialIconKey,
  SocialLink,
} from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { SocialIcon } from "@/components/ui/social-icon";
import { useToast } from "@/components/ui/toast";

const emptyLinkForm = {
  platform_name: "",
  url: "",
  icon_name: "globe" as SocialIconKey,
  is_active: true,
};

type ContactForm = {
  email: string;
  location: string;
  whatsapp: string;
  telegram: string;
  google_maps_url: string;
};

const emptyContact = (): ContactForm => ({
  email: "",
  location: "",
  whatsapp: "",
  telegram: "",
  google_maps_url: "",
});

const emptySettings = (): SiteSettings => ({
  id: 1,
  email: null,
  location: null,
  whatsapp: null,
  telegram: null,
  google_maps_url: null,
  updated_at: new Date().toISOString(),
});

function fromSettings(data: SiteSettings): ContactForm {
  return {
    email: data.email ?? "",
    location: data.location ?? "",
    whatsapp: data.whatsapp ?? "",
    telegram: data.telegram ?? "",
    google_maps_url: data.google_maps_url ?? "",
  };
}

export function SettingsManager() {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SiteSettings>(emptySettings());
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [contact, setContact] = useState<ContactForm>(emptyContact());
  const [formError, setFormError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<SocialLink | null>(null);
  const [linkForm, setLinkForm] = useState(emptyLinkForm);
  const [linkError, setLinkError] = useState<string | null>(null);

  const activeCount = useMemo(
    () => links.filter((l) => l.is_active).length,
    [links]
  );

  const emailPreview = contact.email.trim()
    ? toMailtoLink(contact.email)
    : null;
  const waPreview = contact.whatsapp.trim()
    ? toWhatsAppLink(contact.whatsapp)
    : null;
  const tgPreview = contact.telegram.trim()
    ? toTelegramLink(contact.telegram)
    : null;
  const mapsPreview = safeExternalHref(contact.google_maps_url);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSettingsBundle();
      if (result.success && result.data) {
        setSettings(result.data.settings);
        setLinks(result.data.social_links);
        setContact(fromSettings(result.data.settings));
      } else if (!result.success) {
        error(result.error || "تعذّر تحميل البيانات حالياً، يرجى المحاولة لاحقاً");
      }
    } catch (err) {
      console.error("[settings-manager] load:", err);
      error("تعذّر تحميل البيانات حالياً، يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSaveContact(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (contact.email.trim() && !isValidEmail(contact.email)) {
      setFormError("صيغة البريد الإلكتروني غير صحيحة");
      return;
    }
    if (
      contact.google_maps_url.trim() &&
      !isValidMapsUrl(contact.google_maps_url.trim())
    ) {
      setFormError(
        "رابط الخريطة غير صالح — استخدم رابط Google Maps بصيغة https://"
      );
      return;
    }

    const payload = {
      email: contact.email.trim(),
      location: contact.location.trim(),
      whatsapp: contact.whatsapp.trim(),
      telegram: contact.telegram.trim(),
      google_maps_url: contact.google_maps_url.trim(),
    };

    startTransition(async () => {
      try {
        const result = await saveSiteSettings(payload);
        if (result.success && result.data) {
          setSettings(result.data);
          setContact(fromSettings(result.data));
          success(result.message ?? "تم الحفظ بنجاح");
        } else if (!result.success) {
          error(result.error);
        }
      } catch (err) {
        console.error("[settings-manager] saveSiteSettings:", err);
        error("حدث خطأ أثناء الحفظ");
      }
    });
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
      platform_name: link.platform_name,
      url: link.url,
      icon_name: link.icon_name,
      is_active: link.is_active,
    });
    setLinkError(null);
    setModalOpen(true);
  }

  function handleSaveLink(e: FormEvent) {
    e.preventDefault();
    const validation = validateSocialUrl(linkForm.icon_name, linkForm.url);
    if (validation) {
      setLinkError(validation);
      return;
    }
    if (!linkForm.platform_name.trim()) {
      setLinkError("اسم المنصة مطلوب");
      return;
    }

    const normalizedUrl = normalizeSocialUrl(
      linkForm.icon_name,
      linkForm.url
    );
    if (!safeExternalHref(normalizedUrl)) {
      setLinkError(
        "الرابط يجب أن يكون خارجياً بصيغة https:// أو tel: أو mailto:"
      );
      return;
    }

    const input = {
      platform_name: linkForm.platform_name.trim(),
      url: normalizedUrl,
      icon_name: linkForm.icon_name,
      is_active: linkForm.is_active,
    };

    startTransition(async () => {
      try {
        const result = editing
          ? await updateSocialLink(editing.id, input)
          : await createSocialLink(input);

        if (result.success && result.data) {
          setLinks((prev) =>
            editing
              ? prev.map((l) => (l.id === editing.id ? result.data! : l))
              : [...prev, result.data!]
          );
          setModalOpen(false);
          success(result.message ?? "تم الحفظ");
        } else if (!result.success) {
          setLinkError(result.error);
          error(result.error);
        }
      } catch (err) {
        console.error("[settings-manager] saveSocialLink:", err);
        error("حدث خطأ أثناء حفظ القناة");
      }
    });
  }

  function handleToggleActive(id: string, is_active: boolean) {
    startTransition(async () => {
      setLinks((prev) =>
        prev.map((l) => (l.id === id ? { ...l, is_active } : l))
      );

      try {
        const result = await toggleSocialLinkActive(id, is_active);
        if (result.success && result.data) {
          setLinks((prev) =>
            prev.map((l) => (l.id === id ? result.data! : l))
          );
          success(result.message ?? "تم التحديث");
        } else if (!result.success) {
          setLinks((prev) =>
            prev.map((l) =>
              l.id === id ? { ...l, is_active: !is_active } : l
            )
          );
          error(result.error);
        }
      } catch (err) {
        console.error("[settings-manager] toggleSocialLinkActive:", err);
        setLinks((prev) =>
          prev.map((l) =>
            l.id === id ? { ...l, is_active: !is_active } : l
          )
        );
        error("تعذر تحديث حالة القناة");
      }
    });
  }

  function confirmDelete() {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);

    startTransition(async () => {
      const previous = links;
      setLinks((prev) => prev.filter((l) => l.id !== id));

      try {
        const result = await deleteSocialLink(id);
        if (result.success) {
          success(result.message ?? "تم الحذف");
        } else {
          setLinks(previous);
          error(result.error);
        }
      } catch (err) {
        console.error("[settings-manager] deleteSocialLink:", err);
        setLinks(previous);
        error("تعذر حذف القناة");
      }
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-600 dark:text-slate-400">
        جاري التحميل...
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
            إدارة بيانات التواصل والقنوات الظاهرة على المنصة
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          قنوات مفعّلة:{" "}
          <span className="font-bold text-teal-700 dark:text-teal-300">
            {activeCount}
          </span>
        </div>
      </header>

      <form onSubmit={handleSaveContact} className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                التواصل الرسمي
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                البريد، واتساب، وتيليجرام
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
              value={contact.whatsapp}
              onChange={(v) => setContact((c) => ({ ...c, whatsapp: v }))}
              placeholder="رقم أو https://wa.me/..."
              hint={waPreview ? `معاينة: ${waPreview}` : undefined}
              previewHref={safeExternalHref(waPreview ?? "")}
              icon={<MessageCircle className="h-4 w-4" />}
            />
            <Field
              label="تيليجرام"
              value={contact.telegram}
              onChange={(v) => setContact((c) => ({ ...c, telegram: v }))}
              placeholder="@channel أو https://t.me/..."
              hint={tgPreview ? `معاينة: ${tgPreview}` : undefined}
              previewHref={safeExternalHref(tgPreview ?? "")}
              icon={<Send className="h-4 w-4" />}
            />
          </div>
        </section>

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
                العنوان النصي ورابط خرائط جوجل
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <Field
              label="العنوان النصي"
              value={contact.location}
              onChange={(v) => setContact((c) => ({ ...c, location: v }))}
              placeholder="مثال: طرابلس، ليبيا — حي …"
            />
            <Field
              label="رابط خرائط جوجل"
              value={contact.google_maps_url}
              onChange={(v) =>
                setContact((c) => ({ ...c, google_maps_url: v }))
              }
              placeholder="https://maps.google.com/..."
              hint={
                mapsPreview
                  ? "الرابط صالح — يمكن فتحه مباشرة"
                  : contact.google_maps_url
                    ? "تحقق من صيغة الرابط"
                    : undefined
              }
              previewHref={mapsPreview}
              icon={<ExternalLink className="h-4 w-4" />}
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
          حفظ إعدادات التواصل والموقع
        </button>
      </form>

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
                إضافة / تعديل / حذف مع أيقونة وتفعيل لكل قناة
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
          {links.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
              لا توجد قنوات بعد — أضف أول منصة اجتماعية من هنا
            </div>
          ) : (
            links.map((link) => {
              const href = safeExternalHref(link.url);
              return (
                <article
                  key={link.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-teal-200 dark:border-slate-800 dark:hover:border-teal-900 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                      <SocialIcon
                        name={link.icon_name}
                        className="h-5 w-5"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                        {link.platform_name}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {link.icon_name}
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
                      checked={link.is_active}
                      onChange={(v) => handleToggleActive(link.id, v)}
                      label={link.is_active ? "مفعّل" : "متوقف"}
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
              value={linkForm.icon_name}
              onChange={(e) =>
                setLinkForm((f) => ({
                  ...f,
                  icon_name: e.target.value as SocialIconKey,
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
              <SocialIcon name={linkForm.icon_name} />
              معاينة أيقونة Lucide
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              اسم المنصة
            </span>
            <input
              value={linkForm.platform_name}
              onChange={(e) =>
                setLinkForm((f) => ({
                  ...f,
                  platform_name: e.target.value,
                }))
              }
              placeholder="Facebook"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              required
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              الرابط
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
              {linkForm.is_active ? (
                <Eye className="h-4 w-4 text-teal-700" />
              ) : (
                <EyeOff className="h-4 w-4 text-slate-400" />
              )}
              مفعّل على الموقع العام
            </div>
            <Switch
              checked={linkForm.is_active}
              onChange={(v) => setLinkForm((f) => ({ ...f, is_active: v }))}
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
              هل أنت متأكد من حذف هذه القناة؟
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