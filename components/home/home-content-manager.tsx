"use client";

import { FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import { FileText, Home, Save } from "lucide-react";
import {
  getHomeContent,
  saveHomeContent,
} from "@/app/admin/home/actions";
import type { HomeContent } from "@/lib/types";
import { useToast } from "@/components/ui/toast";

type FormState = {
  hero_title: string;
  hero_subtitle: string;
  cta_button: string;
  about_text: string;
};

const emptyForm = (): FormState => ({
  hero_title: "",
  hero_subtitle: "",
  cta_button: "",
  about_text: "",
});

function fromContent(data: HomeContent): FormState {
  return {
    hero_title: data.hero_title ?? "",
    hero_subtitle: data.hero_subtitle ?? "",
    cta_button: data.cta_button ?? "",
    about_text: data.about_text ?? "",
  };
}

export function HomeContentManager() {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getHomeContent();
      if (result.success && result.data) {
        setForm(fromContent(result.data));
      } else if (!result.success) {
        error(result.error || "تعذر تحميل محتوى الصفحة الرئيسية");
      }
    } catch (err) {
      console.error("[home-manager] load:", err);
      error("تعذر تحميل محتوى الصفحة الرئيسية");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSave(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const result = await saveHomeContent({
          hero_title: form.hero_title,
          hero_subtitle: form.hero_subtitle,
          cta_button: form.cta_button,
          about_text: form.about_text,
        });
        if (result.success && result.data) {
          setForm(fromContent(result.data));
          success(result.message ?? "تم الحفظ بنجاح");
        } else if (!result.success) {
          error(result.error);
        }
      } catch (err) {
        console.error("[home-manager] save:", err);
        error("حدث خطأ أثناء الحفظ");
      }
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-600 dark:text-slate-400">
        جاري تحميل محتوى الصفحة الرئيسية...
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <header>
        <div className="mb-1 flex items-center gap-2 text-teal-700 dark:text-teal-300">
          <Home className="h-5 w-5" />
          <span className="text-sm font-semibold">محتوى الموقع</span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          الصفحة الرئيسية
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          تعديل العنوان الرئيسي والنص التعريفي وزر الدعوة للإجراء
        </p>
      </header>

      <form onSubmit={handleSave} className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                قسم البطل (Hero)
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                العنوان، الوصف، ونص زر الدعوة للإجراء
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                العنوان الرئيسي
              </span>
              <input
                value={form.hero_title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, hero_title: e.target.value }))
                }
                placeholder="أدخل عنوان الصفحة الرئيسية"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                النص الفرعي
              </span>
              <textarea
                value={form.hero_subtitle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, hero_subtitle: e.target.value }))
                }
                placeholder="أدخل وصفاً قصيراً يظهر تحت العنوان"
                rows={3}
                className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                نص زر الدعوة للإجراء (CTA)
              </span>
              <input
                value={form.cta_button}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cta_button: e.target.value }))
                }
                placeholder="مثال: ابدأ الآن"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            نبذة عن المنصة
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            النص التعريفي الذي يظهر في قسم من نحن / عن المنصة
          </p>
          <label className="mt-4 block space-y-1.5">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              نص النبذة
            </span>
            <textarea
              value={form.about_text}
              onChange={(e) =>
                setForm((f) => ({ ...f, about_text: e.target.value }))
              }
              placeholder="أدخل النص التعريفي للمنصة"
              rows={6}
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
        </section>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-70"
        >
          <Save className="h-4 w-4" />
          حفظ محتوى الصفحة الرئيسية
        </button>
      </form>
    </div>
  );
}