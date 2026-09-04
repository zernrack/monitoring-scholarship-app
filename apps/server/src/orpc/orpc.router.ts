import {
  hasAnyRole,
  type UserRole,
} from "@monitoring-scholarship-app/auth/rbac";
import { appContract } from "@monitoring-scholarship-app/api";
import { implement, ORPCError } from "@orpc/server";

import type { OrpcContext } from "./orpc.context";
import { OrpcService } from "./orpc.service";

export function createAppRouter(orpcService: OrpcService) {
  const o = implement<typeof appContract, OrpcContext>(appContract);

  // This is the oRPC transport adapter for RBAC. Nest controllers should use a
  // Nest guard instead; both adapters share `hasAnyRole` as the role policy.
  const createRoleMiddleware = (...allowedRoles: UserRole[]) =>
    o.middleware(async ({ context, next }) => {
      if (!context.session) {
        throw new ORPCError("UNAUTHORIZED");
      }

      if (!hasAnyRole(context.session.user.role, allowedRoles)) {
        throw new ORPCError("FORBIDDEN");
      }

      return next({
        context: {
          session: context.session,
        },
      });
    });

  return o.router({
    healthCheck: o.healthCheck.handler(() => orpcService.healthCheck()),
    privateData: o.privateData
      .use(createRoleMiddleware("student", "provider", "admin"))
      .handler(({ context }) => {
        return orpcService.getPrivateData(context.session.user);
      }),
  });
}
