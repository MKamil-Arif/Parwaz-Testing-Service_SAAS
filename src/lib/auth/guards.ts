import { redirect } from "next/navigation";
import { getSession, type CurrentSession } from "./session";
import { hasPermission, isStaff, isStudent, type Permission } from "./permissions";

export async function getCurrentUser() {
  return (await getSession())?.user ?? null;
}

/** Any signed-in account. */
export async function requireUser(next?: string): Promise<CurrentSession> {
  const session = await getSession();
  if (!session) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return session;
}

/** Student-only areas. Staff are sent to the admin area. */
export async function requireStudent(next?: string): Promise<CurrentSession> {
  const session = await requireUser(next);
  if (!isStudent(session.user.roles)) redirect(isStaff(session.user.roles) ? "/admin" : "/");
  return session;
}

/** Admin areas: requires a staff role and, optionally, a specific permission. */
export async function requireStaff(permission?: Permission): Promise<CurrentSession> {
  const session = await requireUser("/admin");
  if (!isStaff(session.user.roles)) redirect("/dashboard");
  if (permission && !hasPermission(session.user.roles, permission)) redirect("/admin?denied=1");
  return session;
}

/** For server actions that must fail closed instead of redirecting. */
export async function staffOrThrow(permission: Permission): Promise<CurrentSession> {
  const session = await getSession();
  if (!session || !isStaff(session.user.roles) || !hasPermission(session.user.roles, permission)) {
    throw new Error("Not authorized");
  }
  return session;
}
