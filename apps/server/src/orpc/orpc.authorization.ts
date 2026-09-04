import { hasAnyRole, type UserRole } from "@monitoring-scholarship-app/auth/rbac";
import { ORPCError } from "@orpc/server";

type SessionUser = {
  role?: string | null;
};

/** Enforce a global Better Auth role in an oRPC middleware or service. */
export function requireRoles<TSession extends { user: SessionUser }>(
  session: TSession | null | undefined,
  allowedRoles: readonly UserRole[],
) : TSession {
  if (!session) {
    throw new ORPCError("UNAUTHORIZED");
  }

  if (!hasAnyRole(session.user.role, allowedRoles)) {
    throw new ORPCError("FORBIDDEN");
  }

  return session;
}
