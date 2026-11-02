import { ROLES, STAFF_ROLES, type RoleName } from "@/lib/constants";

const { SUPER_ADMIN, ADMIN, FINANCE, CONTENT, EXAMINER } = ROLES;

/** Role-based access control: which staff roles may use each admin capability. */
export const PERMISSIONS = {
  "dashboard.view": [SUPER_ADMIN, ADMIN, FINANCE, CONTENT, EXAMINER],
  "students.manage": [SUPER_ADMIN, ADMIN],
  "competitions.manage": [SUPER_ADMIN, ADMIN],
  "questions.manage": [SUPER_ADMIN, ADMIN, EXAMINER],
  "exams.manage": [SUPER_ADMIN, ADMIN, EXAMINER],
  "registrations.manage": [SUPER_ADMIN, ADMIN],
  "payments.manage": [SUPER_ADMIN, ADMIN, FINANCE],
  "results.manage": [SUPER_ADMIN, ADMIN, EXAMINER],
  "results.approve": [SUPER_ADMIN, ADMIN],
  "prizes.manage": [SUPER_ADMIN, ADMIN],
  "notifications.send": [SUPER_ADMIN, ADMIN, CONTENT],
  "support.manage": [SUPER_ADMIN, ADMIN],
  "marketing.manage": [SUPER_ADMIN, ADMIN, CONTENT],
  "finance.manage": [SUPER_ADMIN, ADMIN, FINANCE],
  "content.manage": [SUPER_ADMIN, ADMIN, CONTENT],
  "ceremonies.manage": [SUPER_ADMIN, ADMIN, CONTENT],
  "users.manage": [SUPER_ADMIN],
  "audit.view": [SUPER_ADMIN, ADMIN],
} satisfies Record<string, RoleName[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(roles: string[], permission: Permission): boolean {
  const allowed: string[] = PERMISSIONS[permission];
  return roles.some((r) => allowed.includes(r));
}

export function isStaff(roles: string[]): boolean {
  return roles.some((r) => (STAFF_ROLES as string[]).includes(r));
}

export function isStudent(roles: string[]): boolean {
  return roles.includes(ROLES.STUDENT);
}
