import { appContract } from "@monitoring-scholarship-app/api";
import { ORPCError, implement } from "@orpc/server";

import type { OrpcContext } from "./orpc.context";
import { OrpcService } from "./orpc.service";

export function createAppRouter(orpcService: OrpcService) {
  const o = implement<typeof appContract, OrpcContext>(appContract);

  const requireAuth = o.middleware(async ({ context, next }) => {
    if (!context.session?.user) {
      throw new ORPCError("UNAUTHORIZED");
    }

    return next({
      context: {
        session: context.session,
      },
    });
  });

  return o.router({
    healthCheck: o.healthCheck.handler(() => orpcService.healthCheck()),
    privateData: o.privateData.use(requireAuth).handler(({ context }) => {
      return orpcService.getPrivateData(context.session.user);
    }),
  });
}
