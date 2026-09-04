import { Module, type MiddlewareConsumer, type NestModule } from "@nestjs/common";

import { OrpcMiddleware } from "./orpc.middleware";
import { OrpcService } from "./orpc.service";

@Module({
  providers: [OrpcMiddleware, OrpcService],
})
export class OrpcModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(OrpcMiddleware).forRoutes("rpc/*path", "api-reference/*path");
  }
}
