import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { PAYMENT_STATUS, TICKET_STATUS, label } from "@/lib/constants";
import { logoutAction } from "@/actions/auth";
import { AppShell, type NavGroup, type NavItem } from "@/components/app-shell/app-shell";
import { Alert } from "@/components/ui/layout";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Rewarding Potential" }, robots: { index: false } };

type Item = NavItem & { perm: Permission };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff("dashboard.view");
  const roles = session.user.roles;
  const can = (p: Permission) => hasPermission(roles, p);

  const [pendingPayments, openTickets] = await Promise.all([
    can("payments.manage") ? db.payment.count({ where: { status: PAYMENT_STATUS.PENDING_VERIFICATION } }) : 0,
    can("support.manage") ? db.supportTicket.count({ where: { status: { in: [TICKET_STATUS.OPEN] } } }) : 0,
  ]);

  const groups: { title?: string; items: Item[] }[] = [
    { items: [{ href: "/admin", label: "Overview", icon: "LayoutDashboard", exact: true, perm: "dashboard.view" }] },
    {
      title: "Competitions",
      items: [
        { href: "/admin/competitions", label: "Competitions", icon: "Trophy", perm: "competitions.manage" },
        { href: "/admin/questions", label: "Question bank", icon: "BookOpen", perm: "questions.manage" },
        { href: "/admin/exams", label: "Examinations", icon: "ListChecks", perm: "exams.manage" },
        { href: "/admin/registrations", label: "Registrations", icon: "ClipboardList", perm: "registrations.manage" },
        { href: "/admin/students", label: "Students", icon: "Users", perm: "students.manage" },
      ],
    },
    {
      title: "Results & prizes",
      items: [
        { href: "/admin/results", label: "Results & merit lists", icon: "Award", perm: "results.manage" },
        { href: "/admin/leaderboards", label: "Leaderboards", icon: "Medal", perm: "results.manage" },
        { href: "/admin/winners", label: "Winners", icon: "UserCheck", perm: "prizes.manage" },
        { href: "/admin/prizes", label: "Prizes & distribution", icon: "Gift", perm: "prizes.manage" },
        { href: "/admin/ceremonies", label: "Award ceremonies", icon: "PartyPopper", perm: "ceremonies.manage" },
      ],
    },
    {
      title: "Money",
      items: [
        { href: "/admin/payments", label: "Payments", icon: "CreditCard", perm: "payments.manage", badge: pendingPayments },
        { href: "/admin/finance", label: "Financial reports", icon: "Wallet", perm: "finance.manage" },
      ],
    },
    {
      title: "Engagement",
      items: [
        { href: "/admin/notifications", label: "Notifications", icon: "Bell", perm: "notifications.send" },
        { href: "/admin/support", label: "Support & complaints", icon: "LifeBuoy", perm: "support.manage", badge: openTickets },
        { href: "/admin/marketing", label: "Marketing", icon: "Megaphone", perm: "marketing.manage" },
        { href: "/admin/content", label: "Website content", icon: "FileText", perm: "content.manage" },
      ],
    },
    {
      title: "System",
      items: [
        { href: "/admin/users", label: "Admin users & roles", icon: "ShieldCheck", perm: "users.manage" },
        { href: "/admin/audit-logs", label: "Audit logs", icon: "ScrollText", perm: "audit.view" },
        { href: "/admin/outbox", label: "Email outbox", icon: "Mail", perm: "audit.view" },
        { href: "/admin/account", label: "My account", icon: "KeyRound", perm: "dashboard.view" },
      ],
    },
  ];

  const nav: NavGroup[] = groups
    .map((g) => ({ title: g.title, items: g.items.filter((i) => can(i.perm)).map(({ perm: _perm, ...rest }) => rest) }))
    .filter((g) => g.items.length);

  const roleLabel = roles.filter((r) => r !== "STUDENT").map(label).join(", ");

  return (
    <AppShell area="admin" groups={nav} user={{ name: session.user.fullName, email: session.user.email, roleLabel }} logout={logoutAction}>
      {session.user.mustChangePassword && (
        <Alert tone="warning" className="mb-6" title="Please change your temporary password">
          This account is using a password that was set for you. <Link href="/admin/account" className="font-semibold underline">Change it now</Link>.
        </Alert>
      )}
      {children}
    </AppShell>
  );
}
