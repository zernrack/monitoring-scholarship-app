import "reflect-metadata";
import { auth } from "@monitoring-scholarship-app/auth";
import { env } from "@monitoring-scholarship-app/env/server";
import { NestFactory } from "@nestjs/core";
import { toNodeHandler } from "better-auth/node";
import express from "express";

import { AppModule } from "./app.module";

async function bootstrap() {
  // Better Auth must receive its raw Node request before any body parser consumes it.
  // JSON and URL-encoded parsing are restored below for every other API route.
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.enableCors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.all("/api/auth/*path", toNodeHandler(auth));

  // Keep normal NestJS controllers and oRPC endpoints supplied with parsed bodies.
  expressApp.use(express.json());
  expressApp.use(express.urlencoded({ extended: true }));

  await app.listen(3000);
  console.log("Server is running on http://localhost:3000");
}

bootstrap();
