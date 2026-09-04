import { oc, type ContractRouterClient } from "@orpc/contract";
import { z } from "zod";

export const appContract = {
  healthCheck: oc.output(z.literal("OK")),
  privateData: oc.output(
    z.object({
      message: z.string(),
      user: z.unknown().nullable(),
    }),
  ),
};

export type AppRouterClient = ContractRouterClient<typeof appContract>;
