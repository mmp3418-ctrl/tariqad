"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { ComponentType } from "react";
import {
  AtSign,
  Camera,
  Globe,
  KeyRound,
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
  changeAdminPassword,
  getSiteSettings,
  updateSiteSettings,
} from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

/** Brand glyphs aren't shipped in this Lucide build — map platforms to clear generic icons. */
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
  };
}

export function SettingsManager() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();
  const [form, setForm] = useState({
    logo_url: "",
    phone_number: "",
    whatsapp_number: "",
    telegram_link: "",
    social_links: [] as SocialLink[],
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
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
      });
    } else if (!result.success) {
      error(result.error);
    }
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

  function removeSocial(id: string) {
    setForm((prev) => ({
      ...prev,
      social_links: prev.social_links.filter((link) => link.id !== id),
    }));
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
          });
        }
      } else {
        error(result.error);
      }
    });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    startPasswordTransition(async () => {
      const result = await changeAdminPassword(passwordForm);
      if (result.success) {
        success(result.message ?? "تم تغيير كلمة المرور بنجاح");
        setPasswordForm({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
      } else {
        error(result.error);
      }
    });
  }

  if (loading) {
    return <PageLoader label="جاري تحميل إعدادات الموقع..." />;
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-1 flex items-center gap-2 text-teal-700">
          <Settings className="h-5 w-5" />
          <span className="text-sm font-semibold">إعدادات الموقع</span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">
          إعدادات الموقع الهوية والتواصل
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          تحكم كامل في الشعار، التواصل، السوشيال، وكلمة مرور لوحة التحكم
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-base font-bold text-slate-900">
            الهوية البصرية
          </h3>
          <div className="grid gap-5 lg:grid-cols-[1fr_180px]">
            <Input
              label="رابط الشعار (Logo URL)"
              name="logo_url"
              dir="ltr"
              type="url"
              placeholder="https://.../logo.png"
              value={form.logo_url}
              onChange={(e) =>
                setForm((f) => ({ ...f, logo_url: e.target.value }))
              }
            />
            <div className="flex items-end">
              <div className="flex h-[46px] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50">
                {form.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.logo_url}
                    alt="معاينة الشعار"
                    className="max-h-10 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400">معاينة الشعار</span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-base font-bold text-slate-900">
            أرقام التواصل والتيليجرام
          </h3>
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

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                وسائل التواصل الاجتماعي
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                أضف منصات متعددة مع أيقونة ورابط لكل منها
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
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              لا توجد روابط بعد — اضغط «إضافة منصة» للبدء
            </div>
          ) : (
            <div className="space-y-3">
              {form.social_links.map((link) => {
                const Icon = SOCIAL_ICONS[link.icon] ?? Globe;
                return (
                  <div
                    key={link.id}
                    className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-[auto_1fr_1fr_1fr_auto] sm:items-end"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Input
                      label="اسم المنصة"
                      name={`platform-${link.id}`}
                      value={link.platform}
                      placeholder="Facebook"
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
                      placeholder="https://"
                      onChange={(e) =>
                        updateSocial(link.id, { url: e.target.value })
                      }
                    />
                    <Select
                      label="الأيقونة"
                      name={`icon-${link.id}`}
                      value={link.icon}
                      onChange={(e) =>
                        updateSocial(link.id, {
                          icon: e.target.value as SocialIconKey,
                        })
                      }
                    >
                      {SOCIAL_ICON_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      className="sm:mb-0.5"
                      onClick={() => removeSocial(link.id)}
                      aria-label="حذف المنصة"
                    >
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              تغيير كلمة المرور
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              تُحفظ كلمة المرور في قاعدة البيانات وتُستخدم لتسجيل الدخول إلى لوحة
              التحكم
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Input
            label="كلمة المرور الحالية"
            name="current_password"
            type="password"
            required
            autoComplete="current-password"
            value={passwordForm.current_password}
            onChange={(e) =>
              setPasswordForm((f) => ({
                ...f,
                current_password: e.target.value,
              }))
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="كلمة المرور الجديدة"
              name="new_password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={passwordForm.new_password}
              onChange={(e) =>
                setPasswordForm((f) => ({
                  ...f,
                  new_password: e.target.value,
                }))
              }
            />
            <Input
              label="تأكيد كلمة المرور الجديدة"
              name="confirm_password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={passwordForm.confirm_password}
              onChange={(e) =>
                setPasswordForm((f) => ({
                  ...f,
                  confirm_password: e.target.value,
                }))
              }
            />
          </div>
          <div className="flex justify-end pt-1">
            <Button type="submit" loading={passwordPending}>
              <KeyRound className="h-4 w-4" />
              تحديث كلمة المرور
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
