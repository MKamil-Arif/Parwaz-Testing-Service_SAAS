import { getCurrentUser } from "@/lib/auth/guards";
import { isStaff } from "@/lib/auth/permissions";
import { NavbarClient } from "./navbar-client";

export const PUBLIC_NAV = [
  { href: "/competitions", label: "Competitions" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/prizes", label: "Prizes" },
  { href: "/winners", label: "Winners" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export async function Navbar() {
  const user = await getCurrentUser();
  const account = user
    ? { name: user.fullName, href: isStaff(user.roles) ? "/admin" : "/dashboard", label: isStaff(user.roles) ? "Admin panel" : "My dashboard" }
    : null;
  return <NavbarClient items={PUBLIC_NAV} account={account} />;
}
