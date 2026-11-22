"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BookOpen,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  CirclePlay,
  School,
  X,
} from "lucide-react";
import { PlatformLogo } from "@/components/brand/platform-logo";
import { clearSession, readSession } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/toast";

const NAV = [
  { href: "/admin", label: "نظرة عامة", icon: LayoutDashboard, exact: true },
  { href: "/admin/home", label: "الصفحة الرئيسية", icon: Home, exact: false },
  { href: "/admin/books", label: "الكتب", icon: BookOpen, exact: false },
  {
    href: "/admin/academic",
    label: "الهيكل الأكاديمي",
    icon: GraduationCap,
    exact: false,
  },
  {
    href: "/admin/materials",
    label: "المواد التعليمية",
    icon: FileText,
    exact: false,
  },
  {
    href: "/admin/playlists",
    label: "قوائم الفيديو",
    icon: CirclePlay,
    exact: false,
  },
  {
    href: "/admin/teacher",
    label: "مساحة المعلم",
    icon: School,
    exact: false,
  },
  {
    href: "/admin/settings",
    label: "التواصل والقنوات",
    icon: Settings,
    exact: false,
  },
] as const;

function normalizePath(path: string): string {
  if (!path) return "/";
  const trimmed = path.replace(/\/+$/, "");
  return trimmed.length ? trimmed : "/";
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("admin");

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setUsername(session.username);
    setReady(true);
  }, [router]);

  function logout() {
    clearSession();
    router.replace("/login");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        جاري التحميل...
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen max-w-[100vw] overflow-x-hidden bg-[#070b12] text-slate-100">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed start-3 top-3 z-40 rounded-xl border border-white/10 bg-slate-900 p-2.5 shadow-lg lg:hidden"
          aria-label="فتح القائمة"
        >
          <Menu className="h-5 w-5 text-slate-100" />
        </button>

        <button
          type="button"
          className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out lg:hidden ${
            open
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          aria-label="إغلاق"
          aria-hidden={!open}
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
        />

        <aside
          className={`fixed inset-y-0 start-0 z-50 flex w-[min(18rem,88vw)] flex-col border-e border-white/5 bg-gradient-to-b from-[#0c2f2c] via-[#0a2422] to-[#071816] text-white shadow-2xl transition-transform duration-300 ease-in-out will-change-transform lg:static lg:w-72 lg:translate-x-0 ${
            open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
            <div className="flex min-w-0 items-center gap-3">
              <PlatformLogo priority className="h-12 w-auto shrink-0 object-contain" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-teal-200/70">لوحة التحكم</p>
                <h1 className="text-xl font-extrabold tracking-tight">منصة طارق</h1>
                <p className="mt-1 truncate text-xs text-teal-100/60">{username}</p>
              </div>
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
            {NAV.map((item) => {
              const Icon = item.icon;
              const current = normalizePath(pathname);
              const target = normalizePath(item.href);
              const active = item.exact
                ? current === target
                : current === target || current.startsWith(`${target}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  scroll
                  onClick={() => setOpen(false)}
                  className={`relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors duration-200 ${
                    active
                      ? "bg-white text-teal-950 shadow-md shadow-black/20"
                      : "text-teal-50/85 hover:bg-white/10"
                  }`}
                >
                  {active ? (
                    <span
                      className="absolute inset-y-2 end-0 w-1 rounded-full bg-teal-600"
                      aria-hidden
                    />
                  ) : null}
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-3">
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-teal-50/85 transition hover:bg-rose-500/20 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              تسجيل الخروج
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <main className="flex-1 px-3 py-5 pt-16 sm:px-5 lg:px-8 lg:py-8 lg:pt-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}