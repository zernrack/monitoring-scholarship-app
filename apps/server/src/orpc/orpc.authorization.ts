import { hasAnyRole, type UserRole } from "@monitoring-scholarship-app/auth/rbac";
import { ORPCError } from "@orpc/server";

type SessionUser = {
  role?: string | null;
};

/**
 * Require an authenticated session whose user has at least one allowed global role.
 *
 * This is the low-level oRPC authorization check. It does not create middleware;
 * `createRoleMiddleware` in `orpc.router.ts` adapts it for a procedure.
 */
export function requireSessionWithAnyRole<TSession extends { user: SessionUser }>(
  session: TSession | null | undefined,
  allowedRoles: readonly UserRole[],
): TSession {
  if (!session) {
    throw new ORPCError("UNAUTHORIZED");
  }

  if (!hasAnyRole(session.user.role, allowedRoles)) {
    throw new ORPCError("FORBIDDEN");
  }

  return session;
}
