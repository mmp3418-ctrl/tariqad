"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  CalendarDays,
  FileText,
  GraduationCap,
  Layers,
  LogOut,
  Megaphone,
  Menu,
  PlayCircle,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { BRAND_AR, BRAND_EN, NAV_ITEMS } from "@/lib/constants";
import { logoutAction } from "@/app/login/actions";

const ICONS = {
  Megaphone,
  GraduationCap,
  Layers,
  FileText,
  PlayCircle,
  Briefcase,
  CalendarDays,
  Users,
  Settings,
} as const;

export function Sidebar({ username }: { username?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-3 top-3 z-40 rounded-xl border border-slate-200/80 bg-white/90 p-2.5 shadow-sm backdrop-blur lg:hidden"
        aria-label="فتح القائمة"
      >
        <Menu className="h-5 w-5 text-slate-700" />
      </button>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/45 lg:hidden"
          aria-label="إغلاق القائمة"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(18rem,88vw)] flex-col bg-sidebar text-white shadow-2xl transition-transform duration-300 lg:static lg:w-72 lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-teal-200/80">لوحة التحكم</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight">
              {BRAND_AR}
            </h1>
            <p className="mt-0.5 truncate text-[11px] text-teal-100/60" dir="ltr">
              {BRAND_EN}
            </p>
            {username && (
              <p className="mt-1 truncate text-xs text-teal-100/70">
                مرحباً، {username}
              </p>
            )}
          </div>
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.icon];
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                  active
                    ? "bg-white text-teal-900 shadow-sm"
                    : "text-teal-50/90 hover:bg-sidebar-hover"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="leading-snug">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-teal-50/90 transition hover:bg-rose-500/20 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
