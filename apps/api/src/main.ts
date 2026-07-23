import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter.js";
import { randomUUID } from "crypto";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true, genReqId: () => randomUUID() }),
  );

  // Register cookie support (use unknown cast for type compatibility)
  const fastifyCookieModule = await import("@fastify/cookie");
  await (app as NestFastifyApplication).register(
    fastifyCookieModule.default as unknown as Parameters<
      typeof app.register
    >[0],
  );

  // Rate limiting
  const rateLimitModule = await import("@fastify/rate-limit");
  await (app as NestFastifyApplication).register(
    rateLimitModule.default as unknown as Parameters<typeof app.register>[0],
    { max: 100, timeWindow: "1 minute" },
  );

  app.enableCors({
    origin: [
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3002",
    ],
    credentials: true,
  });

  app.setGlobalPrefix("api/v1");

  // Global exception filter for consistent error envelopes
  app.useGlobalFilters(new GlobalExceptionFilter());

  // OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle("BotolaHub API")
    .setDescription("Fantasy football for Morocco's Botola Pro — REST API")
    .setVersion("0.1.0")
    .addBearerAuth()
    .addTag("health")
    .addTag("auth")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/v1/docs", app, document);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port, "0.0.0.0");
  console.log(`BotolaHub API is running on http://localhost:${port}/api/v1`);
  console.log(`OpenAPI docs available at http://localhost:${port}/api/v1/docs`);
}

bootstrap();
