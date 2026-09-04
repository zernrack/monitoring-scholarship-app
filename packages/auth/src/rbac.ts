import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

export const USER_ROLES = ["student", "provider", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const accessControl = createAccessControl({
  ...defaultStatements,
  scholarship: ["create", "read", "update", "delete", "publish"],
  application: ["create", "read", "update", "review"],
} as const);

export const roles = {
  student: accessControl.newRole({
    scholarship: ["read"],
    application: ["create", "read", "update"],
  }),
  provider: accessControl.newRole({
    scholarship: ["create", "read", "update", "delete", "publish"],
    application: ["read", "review", "update"],
  }),
  admin: accessControl.newRole({
    ...adminAc.statements,
    scholarship: ["create", "read", "update", "delete", "publish"],
    application: ["create", "read", "update", "review"],
  }),
} as const;

/** Better Auth stores multiple assigned roles as a comma-separated string. */
export function hasAnyRole(
  assignedRoles: string | null | undefined,
  allowedRoles: readonly UserRole[],
) {
  const roles = assignedRoles
    ?.split(",")
    .map((role) => role.trim())
    .filter((role): role is UserRole => USER_ROLES.includes(role as UserRole));

  return roles?.some((role) => allowedRoles.includes(role)) ?? false;
}
