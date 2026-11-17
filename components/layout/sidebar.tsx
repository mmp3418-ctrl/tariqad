"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  GraduationCap,
  Languages,
  Layers,
  LogOut,
  Menu,
  Moon,
  PlayCircle,
  Settings,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { BRAND_AR, BRAND_EN, NAV_ITEMS } from "@/lib/constants";
import { logoutAction } from "@/app/login/actions";
import { useLocale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

const ICONS = {
  GraduationCap,
  Layers,
  PlayCircle,
  Briefcase,
  Users,
  Settings,
} as const;

export function Sidebar({ username }: { username?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { t, locale, toggleLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed start-3 top-3 z-40 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-2.5 shadow-sm backdrop-blur lg:hidden"
        aria-label={t.openMenu}
      >
        <Menu className="h-5 w-5 text-slate-900 dark:text-slate-100" />
      </button>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/45 lg:hidden"
          aria-label={t.close}
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 start-0 z-50 flex w-[min(18rem,88vw)] flex-col bg-sidebar text-white shadow-2xl transition-transform duration-300 lg:static lg:w-72 lg:translate-x-0 lg:shadow-none ${
          open
            ? "translate-x-0"
            : locale === "ar"
              ? "translate-x-full lg:translate-x-0"
              : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-teal-200/80">{t.brandAdmin}</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight">
              {locale === "ar" ? BRAND_AR : BRAND_EN}
            </h1>
            <p
              className="mt-0.5 truncate text-[11px] text-teal-100/60"
              dir={locale === "ar" ? "ltr" : "rtl"}
            >
              {locale === "ar" ? BRAND_EN : BRAND_AR}
            </p>
            {username && (
              <p className="mt-1 truncate text-xs text-teal-100/70">
                {username}
              </p>
            )}
          </div>
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label={t.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.icon];
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const label = t.nav[item.labelKey];

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                  active
                    ? "bg-white dark:bg-slate-900 text-teal-900 shadow-sm"
                    : "text-teal-50/90 hover:bg-sidebar-hover"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="leading-snug">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-white/10 p-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={toggleLocale}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-semibold text-white hover:bg-white/15"
            >
              <Languages className="h-4 w-4" />
              {locale === "ar" ? "EN" : "ع"}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-semibold text-white hover:bg-white/15"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              {theme === "dark" ? t.light : t.dark}
            </button>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-teal-50/90 transition hover:bg-rose-500/20 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              {t.logout}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
