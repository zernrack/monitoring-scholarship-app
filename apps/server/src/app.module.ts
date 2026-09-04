import { Module } from "@nestjs/common";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { OrpcModule } from "./orpc/orpc.module";

@Module({
  imports: [OrpcModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
