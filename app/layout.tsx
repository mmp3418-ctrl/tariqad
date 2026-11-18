import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة طارق | لوحة التحكم",
  description: "Tariq Hub Admin Panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
