import { AdminShell } from "@/components/admin/admin-shell";

/** Ensure /admin/* always resolve via the Next server on Vercel refresh. */
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
