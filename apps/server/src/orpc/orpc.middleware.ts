import type { Request, Response, NextFunction } from "express";

import { Injectable, type NestMiddleware } from "@nestjs/common";
import { OpenAPIHandler } from "@orpc/openapi/node";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/node";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

import { createOrpcContext } from "./orpc.context";
import { createAppRouter } from "./orpc.router";
import { OrpcService } from "./orpc.service";

@Injectable()
export class OrpcMiddleware implements NestMiddleware {
  constructor(private readonly orpcService: OrpcService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const appRouter = createAppRouter(this.orpcService);
    const rpcHandler = new RPCHandler(appRouter, {
      interceptors: [
        onError((error) => {
          console.error(error);
        }),
      ],
    });
    const apiHandler = new OpenAPIHandler(appRouter, {
      plugins: [
        new OpenAPIReferencePlugin({
          schemaConverters: [new ZodToJsonSchemaConverter()],
        }),
      ],
      interceptors: [
        onError((error) => {
          console.error(error);
        }),
      ],
    });

    const context = await createOrpcContext(req);
    const rpcResult = await rpcHandler.handle(req, res, {
      prefix: "/rpc",
      context,
    });
    if (rpcResult.matched) return;

    const apiResult = await apiHandler.handle(req, res, {
      prefix: "/api-reference",
      context,
    });
    if (apiResult.matched) return;

    next();
  }
}
