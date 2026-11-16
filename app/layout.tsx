import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { BRAND_AR, BRAND_EN } from "@/lib/constants";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `لوحة تحكم ${BRAND_AR}`,
    template: `%s | ${BRAND_AR}`,
  },
  description: `${BRAND_AR} — ${BRAND_EN} Admin Dashboard`,
  applicationName: BRAND_AR,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
