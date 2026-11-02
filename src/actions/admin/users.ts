"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, parseForm, success, type ActionState } from "@/lib/action-state";
import { staffOrThrow } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { emailField, phoneField } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";
import { revokeUserSessions } from "@/lib/auth/session";
import { exposeDevLinks, sendPasswordResetEmail } from "@/lib/auth/auth-tokens";
import { randomToken, referralCode } from "@/lib/tokens";
import { ROLES, STAFF_ROLES, USER_STATUS } from "@/lib/constants";

const staffRole = z.enum(STAFF_ROLES as [string, ...string[]]);

/** Creates a staff account and emails a single-use link to set the password (no password is ever shown or sent). */
export async function createStaffAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("users.manage");
  const parsed = parseForm(
    z.object({ fullName: z.string().trim().min(3).max(150), email: emailField, phone: phoneField, roles: z.array(staffRole).min(1, "Choose at least one role") }),
    fd,
    ["roles"],
  );
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;
  if (await db.user.findUnique({ where: { email: d.email } })) return fail("An account with this email already exists.", { email: ["Already registered"] });
  const roles = await db.role.findMany({ where: { name: { in: d.roles } } });
  const user = await db.user.create({
    data: {
      email: d.email,
      fullName: d.fullName,
      phone: d.phone,
      passwordHash: await hashPassword(randomToken(24)),
      emailVerifiedAt: new Date(),
      referralCode: referralCode() + "S",
      roles: { create: roles.map((r) => ({ roleId: r.id })) },
    },
  });
  const link = await sendPasswordResetEmail(user);
  await audit({ actor: s, action: "staff.created", entityType: "User", entityId: user.id, details: { roles: d.roles } });
  revalidatePath("/admin/users");
  return success(`Staff account created. A set-password link was emailed to ${d.email} (valid 1 hour).`, exposeDevLinks() ? { devLink: link } : undefined);
}

export async function setStaffRolesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await staffOrThrow("users.manage");
  const parsed = parseForm(z.object({ userId: z.coerce.number().int(), roles: z.array(staffRole) }), fd, ["roles"]);
  if (!parsed.ok) return parsed.state;
  const { userId, roles } = parsed.data;
  if (userId === s.user.id && !roles.includes(ROLES.SUPER_ADMIN)) return fail("You cannot remove your own super admin role.");
  const target = await db.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
  if (!target) return fail("User not found.");
  const keep = target.roles.filter((r) => r.role.name === ROLES.STUDENT).map((r) => r.roleId);
  const newRoles = await db.role.findMany({ where: { name: { in: roles } } });
  if (!roles.includes(ROLES.SUPER_ADMIN) && target.roles.some((r) => r.role.name === ROLES.SUPER_ADMIN)) {
    const supers = await db.userRole.count({ where: { role: { name: ROLES.SUPER_ADMIN }, user: { status: USER_STATUS.ACTIVE } } });
    if (supers <= 1) return fail("At least one active super admin must remain.");
  }
  await db.$transaction([
    db.userRole.deleteMany({ where: { userId, roleId: { notIn: keep } } }),
    db.userRole.createMany({ data: newRoles.map((r) => ({ userId, roleId: r.id })) }),
  ]);
  await revokeUserSessions(userId);
  await audit({ actor: s, action: "staff.roles_changed", entityType: "User", entityId: userId, details: { from: target.roles.map((r) => r.role.name), to: roles } });
  revalidatePath("/admin/users");
  return success("Roles updated. The user must sign in again.");
}

export async function setStaffStatusAction(userId: number, status: string): Promise<void> {
  const s = await staffOrThrow("users.manage");
  if (userId === s.user.id || (status !== USER_STATUS.ACTIVE && status !== USER_STATUS.SUSPENDED)) return;
  await db.user.update({ where: { id: userId }, data: { status } });
  if (status === USER_STATUS.SUSPENDED) await revokeUserSessions(userId);
  await audit({ actor: s, action: `staff.${status.toLowerCase()}`, entityType: "User", entityId: userId });
  revalidatePath("/admin/users");
}
