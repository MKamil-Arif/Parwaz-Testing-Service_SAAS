import type { Metadata } from "next";
import { requireStudent } from "@/lib/auth/guards";
import { unreadCount } from "@/lib/notifications";
import { logoutAction } from "@/actions/auth";
import { AppShell, type NavGroup } from "@/components/app-shell/app-shell";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Student portal" } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireStudent("/dashboard");
  const unread = await unreadCount(user.id);

  const groups: NavGroup[] = [
    {
      items: [
        { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", exact: true },
        { href: "/dashboard/competitions", label: "Browse competitions", icon: "Search" },
        { href: "/dashboard/registrations", label: "My registrations", icon: "ClipboardList" },
        { href: "/dashboard/payments", label: "My payments", icon: "Wallet" },
        { href: "/dashboard/exams", label: "My examinations", icon: "BookOpen" },
        { href: "/dashboard/results", label: "My results", icon: "Award" },
        { href: "/dashboard/leaderboard", label: "Leaderboard", icon: "Trophy" },
      ],
    },
    {
      title: "Account",
      items: [
        { href: "/dashboard/notifications", label: "Notifications", icon: "Bell", badge: unread },
        { href: "/dashboard/profile", label: "My profile", icon: "User" },
        { href: "/dashboard/support", label: "Help & support", icon: "LifeBuoy" },
      ],
    },
  ];

  return (
    <AppShell
      area="student"
      groups={groups}
      user={{ name: user.fullName, email: user.email, roleLabel: user.isDemo ? "Demo student" : "Student" }}
      notificationsHref="/dashboard/notifications"
      unread={unread}
      logout={logoutAction}
    >
      {children}
    </AppShell>
  );
}
