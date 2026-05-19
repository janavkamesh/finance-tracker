import { getUser } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  let fullName = "User";
  let userInitials = "U";

  // user_metadata is set by updateProfile — no extra DB round-trip needed
  const name =
    (user?.user_metadata?.full_name as string | undefined) ?? "";
  if (name) {
    fullName = name;
    userInitials = name
      .split(" ")
      .slice(0, 2)
      .map((n: string) => n[0])
      .join("")
      .toUpperCase();
  }

  return (
    <div className="flex min-h-screen bg-[#F9F8F5] dark:bg-gray-900">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar fullName={fullName} userInitials={userInitials} />
      </div>

      {/* Mobile header + drawer */}
      <MobileHeader fullName={fullName} userInitials={userInitials} />

      {/* Page content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Spacer so content clears the fixed mobile header */}
        <div className="h-14 md:hidden" />
        {children}
        {/* Spacer so content clears the fixed bottom nav */}
        <div className="h-16 md:hidden" />
      </div>

      {/* Bottom navigation — mobile only */}
      <BottomNav />
    </div>
  );
}
