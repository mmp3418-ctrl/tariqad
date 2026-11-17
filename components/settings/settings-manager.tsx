"use client";

import { useCallback, useEffect, useState, useTransition, type ComponentType } from "react";
import {
  ArrowDown,
  ArrowUp,
  AtSign,
  Camera,
  Ghost,
  Globe,
  MessageCircle,
  Music2,
  Plus,
  Save,
  Send,
  Settings,
  Share2,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import type { SiteSettings, SocialIconKey, SocialLink } from "@/lib/types";
import { SOCIAL_ICON_OPTIONS } from "@/lib/constants";
import {
  getSiteSettings,
  updateSiteSettings,
} from "@/app/(dashboard)/settings/actions";
import { BRAND_AR, BRAND_EN } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

const SOCIAL_ICONS: Record<
  SocialIconKey,
  ComponentType<{ className?: string }>
> = {
  facebook: Users,
  instagram: Camera,
  youtube: Video,
  twitter: AtSign,
  tiktok: Music2,
  linkedin: Share2,
  snapchat: Ghost,
  telegram: Send,
  whatsapp: MessageCircle,
  globe: Globe,
};

function createSocialLink(): SocialLink {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    platform: "",
    url: "",
    icon: "globe",
    custom_icon_url: null,
  };
}

export function SettingsManager() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    logo_url: "",
    phone_number: "",
    whatsapp_number: "",
    telegram_link: "",
    social_links: [] as SocialLink[],
    hero_subtitle_ar: "",
    hero_subtitle_en: "",
    book_year_label: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getSiteSettings();
    if (result.success && result.data) {
      const data: SiteSettings = result.data;
      setForm({
        logo_url: data.logo_url ?? "",
        phone_number: data.phone_number ?? "",
        whatsapp_number: data.whatsapp_number ?? "",
        telegram_link: data.telegram_link ?? "",
        social_links: data.social_links ?? [],
        hero_subtitle_ar: data.hero_subtitle_ar ?? "",
        hero_subtitle_en: data.hero_subtitle_en ?? "",
        book_year_label: data.book_year_label ?? "",
      });
    } else if (!result.success) error(result.error);
    setLoading(false);
  }, [error]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateSocial(id: string, patch: Partial<SocialLink>) {
    setForm((prev) => ({
      ...prev,
      social_links: prev.social_links.map((link) =>
        link.id === id ? { ...link, ...patch } : link
      ),
    }));
  }

  function moveSocial(id: string, dir: -1 | 1) {
    setForm((prev) => {
      const list = [...prev.social_links];
      const idx = list.findIndex((l) => l.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= list.length) return prev;
      [list[idx], list[next]] = [list[next], list[idx]];
      return { ...prev, social_links: list };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateSiteSettings(form);
      if (result.success) {
        success(result.message ?? "تم الحفظ بنجاح");
        if (result.data) {
          setForm({
            logo_url: result.data.logo_url ?? "",
            phone_number: result.data.phone_number ?? "",
            whatsapp_number: result.data.whatsapp_number ?? "",
            telegram_link: result.data.telegram_link ?? "",
            social_links: result.data.social_links ?? [],
            hero_subtitle_ar: result.data.hero_subtitle_ar ?? "",
            hero_subtitle_en: result.data.hero_subtitle_en ?? "",
            book_year_label: result.data.book_year_label ?? "",
          });
        }
      } else error(result.error);
    });
  }

  if (loading) return <PageLoader label="جاري تحميل إعدادات الموقع..." />;

  return (
    <div className="space-y-6 overflow-x-hidden">
      <header>
        <div className="mb-1 flex items-center gap-2 text-teal-700">
          <Settings className="h-5 w-5" />
          <span className="text-sm font-semibold">إعدادات الموقع</span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          إعدادات الموقع
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 ">
          {BRAND_AR} — الشعار والنصوص ووسائل التواصل
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="glass-card space-y-4 p-4 sm:p-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              محتوى الصفحة الرئيسية
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 ">
              الاسم: {BRAND_AR} · {BRAND_EN}
            </p>
          </div>
          <Textarea
            label="النص التعريفي (عربي)"
            name="hero_subtitle_ar"
            value={form.hero_subtitle_ar}
            onChange={(e) =>
              setForm((f) => ({ ...f, hero_subtitle_ar: e.target.value }))
            }
            placeholder="منصتك التعليمية الشاملة للمنهج الليبي"
          />
          <Textarea
            label="النص التعريفي (إنجليزي)"
            name="hero_subtitle_en"
            dir="ltr"
            value={form.hero_subtitle_en}
            onChange={(e) =>
              setForm((f) => ({ ...f, hero_subtitle_en: e.target.value }))
            }
            placeholder="Your complete educational hub..."
          />
          <Input
            label="سنة الكتاب على الغلاف"
            name="book_year_label"
            dir="ltr"
            placeholder="2026 - 2027"
            value={form.book_year_label}
            onChange={(e) =>
              setForm((f) => ({ ...f, book_year_label: e.target.value }))
            }
          />
        </section>

        <section className="glass-card space-y-4 p-4 sm:p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">الشعار</h3>
          <FileUpload
            label="رفع شعار المنصة"
            folder="branding"
            accept="image/*,.png,.jpg,.jpeg,.webp,.svg,.ico"
            value={form.logo_url}
            onUploaded={(url) => setForm((f) => ({ ...f, logo_url: url }))}
            onClear={() => setForm((f) => ({ ...f, logo_url: "" }))}
            hint="PNG / JPG / WEBP / SVG / ICO"
          />
        </section>

        <section className="glass-card space-y-4 p-4 sm:p-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              أرقام التواصل والتيليجرام
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 ">
              عند تعبئة أي حقل ستظهر أيقونته تلقائياً في الموقع الرئيسي
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="رقم الهاتف"
              name="phone_number"
              dir="ltr"
              placeholder="+218..."
              value={form.phone_number}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone_number: e.target.value }))
              }
            />
            <Input
              label="رقم الواتساب"
              name="whatsapp_number"
              dir="ltr"
              placeholder="+218..."
              value={form.whatsapp_number}
              onChange={(e) =>
                setForm((f) => ({ ...f, whatsapp_number: e.target.value }))
              }
            />
            <div className="sm:col-span-2">
              <Input
                label="رابط التيليجرام"
                name="telegram_link"
                dir="ltr"
                type="url"
                placeholder="https://t.me/..."
                value={form.telegram_link}
                onChange={(e) =>
                  setForm((f) => ({ ...f, telegram_link: e.target.value }))
                }
              />
            </div>
          </div>
        </section>

        <section className="glass-card space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                وسائل التواصل الاجتماعي
              </h3>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400 ">
                أضف منصات غير محدودة مع أيقونة جاهزة أو مخصصة
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  social_links: [...f.social_links, createSocialLink()],
                }))
              }
            >
              <Plus className="h-4 w-4" />
              إضافة منصة
            </Button>
          </div>

          {form.social_links.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-10 text-center text-sm text-slate-600 dark:text-slate-400 ">
              لا توجد روابط بعد
            </div>
          ) : (
            <div className="space-y-4">
              {form.social_links.map((link, index) => {
                const Icon = SOCIAL_ICONS[link.icon] ?? Globe;
                return (
                  <div
                    key={link.id}
                    className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {link.custom_icon_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={link.custom_icon_url}
                            alt=""
                            className="h-9 w-9 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-slate-900 text-teal-700 shadow-sm">
                            <Icon className="h-4 w-4" />
                          </div>
                        )}
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          منصة #{index + 1}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => moveSocial(link.id, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => moveSocial(link.id, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              social_links: f.social_links.filter(
                                (s) => s.id !== link.id
                              ),
                            }))
                          }
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="الاسم / التسمية"
                        name={`platform-${link.id}`}
                        value={link.platform}
                        onChange={(e) =>
                          updateSocial(link.id, { platform: e.target.value })
                        }
                      />
                      <Input
                        label="الرابط"
                        name={`url-${link.id}`}
                        dir="ltr"
                        type="url"
                        value={link.url}
                        onChange={(e) =>
                          updateSocial(link.id, { url: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                        اختيار الأيقونة
                      </p>
                      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                        {SOCIAL_ICON_OPTIONS.map((opt) => {
                          const OptIcon = SOCIAL_ICONS[opt.value];
                          const active = link.icon === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              title={opt.label}
                              onClick={() =>
                                updateSocial(link.id, { icon: opt.value })
                              }
                              className={`flex h-10 items-center justify-center rounded-xl border ${
                                active
                                  ? "border-teal-700 bg-teal-50 text-teal-800"
                                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600"
                              }`}
                            >
                              <OptIcon className="h-4 w-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <FileUpload
                      label="أو ارفع أيقونة مخصصة"
                      folder="social-icons"
                      accept="image/*,.png,.jpg,.jpeg,.webp,.svg"
                      value={link.custom_icon_url}
                      onUploaded={(url) =>
                        updateSocial(link.id, { custom_icon_url: url })
                      }
                      onClear={() =>
                        updateSocial(link.id, { custom_icon_url: null })
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="flex justify-end">
          <Button type="submit" size="lg" loading={pending}>
            <Save className="h-4 w-4" />
            حفظ الإعدادات
          </Button>
        </div>
      </form>
    </div>
  );
}
