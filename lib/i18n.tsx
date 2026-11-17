"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "ar" | "en";

const STORAGE_KEY = "tariq-admin-locale";

const dict = {
  ar: {
    brandAdmin: "لوحة التحكم",
    logout: "تسجيل الخروج",
    openMenu: "فتح القائمة",
    close: "إغلاق",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    active: "مفعّل",
    inactive: "متوقف",
    comingSoon: "قريباً",
    loading: "جاري التحميل...",
    language: "اللغة",
    theme: "المظهر",
    light: "فاتح",
    dark: "داكن",
    nav: {
      announcements: "الإعلانات",
      grades: "الصفوف الدراسية",
      units: "الوحدات والدروس",
      notes: "المذكرات والملخصات",
      videos: "الشروحات المرئية",
      teacherSpace: "مساحة المعلم",
      users: "المشرفون والصلاحيات",
      settings: "إعدادات الموقع",
    },
    hub: {
      title: "مساحة المعلم",
      subtitle: "الجداول وموارد المعلم وأداة الدرجات في مكان واحد",
      tabSchedules: "جدول الحصص",
      tabResources: "موارد المعلم",
      tabGrades: "أداة جمع الدرجات",
      noItems: "لا توجد عناصر",
      manageOnly: "عرض وإدارة العناصر الجاهزة — بدون إضافة جديدة",
      open: "فتح",
      toggleActive: "التفعيل",
      toggleSoon: "قريباً",
    },
    settings: {
      title: "إعدادات الموقع",
      subtitle: "الشعار ونصوص الواجهة ووسائل التواصل",
      homeContent: "محتوى الصفحة الرئيسية",
      subtitleAr: "النص التعريفي (عربي)",
      subtitleEn: "النص التعريفي (إنجليزي)",
      bookYear: "سنة الكتاب على الغلاف",
      logo: "الشعار",
      contact: "أرقام التواصل والتيليجرام",
      phone: "رقم الهاتف",
      whatsapp: "رقم الواتساب",
      telegram: "رابط التيليجرام",
      social: "روابط التواصل",
      saved: "تم حفظ الإعدادات",
    },
  },
  en: {
    brandAdmin: "Admin Panel",
    logout: "Log out",
    openMenu: "Open menu",
    close: "Close",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    active: "Active",
    inactive: "Inactive",
    comingSoon: "Coming soon",
    loading: "Loading...",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    nav: {
      announcements: "Announcements",
      grades: "Grades",
      units: "Units & Lessons",
      notes: "Notes & Summaries",
      videos: "Video Lessons",
      teacherSpace: "Teacher Space",
      users: "Admins & Roles",
      settings: "Site Settings",
    },
    hub: {
      title: "Teacher Space",
      subtitle: "Schedules, teacher resources, and grade tools in one place",
      tabSchedules: "Class Schedule",
      tabResources: "Teacher Resources",
      tabGrades: "Grade Calculator",
      noItems: "No items yet",
      manageOnly: "View and manage presets — adding new tools is disabled",
      open: "Open",
      toggleActive: "Active",
      toggleSoon: "Coming soon",
    },
    settings: {
      title: "Site Settings",
      subtitle: "Logo, interface text, and social links",
      homeContent: "Home page content",
      subtitleAr: "Description (Arabic)",
      subtitleEn: "Description (English)",
      bookYear: "Book year on cover",
      logo: "Logo",
      contact: "Contact & Telegram",
      phone: "Phone number",
      whatsapp: "WhatsApp number",
      telegram: "Telegram link",
      social: "Social links",
      saved: "Settings saved",
    },
  },
} as const;

export type Dictionary = (typeof dict)[Locale];

type LocaleContextValue = {
  locale: Locale;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  dir: "rtl" | "ltr";
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved === "ar" || saved === "en") setLocaleState(saved);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "ar" ? "en" : "ar");
  }, [locale, setLocale]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: dict[locale],
      setLocale,
      toggleLocale,
      dir: locale === "ar" ? "rtl" : "ltr",
    }),
    [locale, setLocale, toggleLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
