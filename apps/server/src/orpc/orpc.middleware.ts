import type { Request, Response, NextFunction } from "express";

import { createContext } from "@monitoring-scholarship-app/api/context";
import { appRouter } from "@monitoring-scholarship-app/api/routers/index";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import { OpenAPIHandler } from "@orpc/openapi/node";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/node";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

@Injectable()
export class OrpcMiddleware implements NestMiddleware {
  private rpcHandler = new RPCHandler(appRouter, {
    interceptors: [
      onError((error) => {
        console.error(error);
      }),
    ],
  });

  private apiHandler = new OpenAPIHandler(appRouter, {
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

  async use(req: Request, res: Response, next: NextFunction) {
    const rpcResult = await this.rpcHandler.handle(req, res, {
      prefix: "/rpc",
      context: await createContext({ req }),
    });
    if (rpcResult.matched) return;

    const apiResult = await this.apiHandler.handle(req, res, {
      prefix: "/api-reference",
      context: await createContext({ req }),
    });
    if (apiResult.matched) return;

    next();
  }
}
