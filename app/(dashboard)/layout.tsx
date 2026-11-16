import { Sidebar } from "@/components/layout/sidebar";
import { getSessionUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();

  return (
    <div className="flex min-h-screen max-w-[100vw] overflow-x-hidden bg-transparent">
      <Sidebar username={session?.username} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden">
        <main className="flex-1 overflow-x-hidden px-3 py-5 pt-16 sm:px-5 lg:px-8 lg:py-8 lg:pt-8">
          <div className="mx-auto w-full max-w-7xl animate-fade-in overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
