import type { UserRole } from "@monitoring-scholarship-app/auth/rbac";
import { appContract } from "@monitoring-scholarship-app/api";
import { implement } from "@orpc/server";

import { requireRoles } from "./orpc.authorization";
import type { OrpcContext } from "./orpc.context";
import { OrpcService } from "./orpc.service";

export function createAppRouter(orpcService: OrpcService) {
  const o = implement<typeof appContract, OrpcContext>(appContract);

  const requireRole = (...allowedRoles: UserRole[]) =>
    o.middleware(async ({ context, next }) => {
      const session = requireRoles(context.session, allowedRoles);

      return next({
        context: {
          session,
        },
      });
    });

  return o.router({
    healthCheck: o.healthCheck.handler(() => orpcService.healthCheck()),
    privateData: o.privateData
      .use(requireRole("student", "provider", "admin"))
      .handler(({ context }) => {
        return orpcService.getPrivateData(context.session.user);
      }),
  });
}
