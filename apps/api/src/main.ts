import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { validateEnv } from '@botolahub/config';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor.js';

async function bootstrap() {
  const env = validateEnv();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  app.enableCors();
  app.useGlobalInterceptors(new RequestIdInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('BotolaHub API')
    .setDescription("Morocco's Botola Pro Inwi 1X2 Prediction Game API Services")
    .setVersion('0.1.0-dev')
    .addTag('Health')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(env.PORT_API, '0.0.0.0');
  console.log(`🚀 BotolaHub API running on http://localhost:${env.PORT_API}/api/v1/health`);
  console.log(`📖 Swagger API Docs available at http://localhost:${env.PORT_API}/api/docs`);
}

bootstrap();
