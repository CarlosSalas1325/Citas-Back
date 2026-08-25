import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  // Rule 5: `rawBody: true` makes Nest stash the exact raw bytes of every request on
  // `req.rawBody` (a Buffer), alongside the normal parsed `req.body`. The Stripe webhook
  // handler (src/modules/billing/webhook/stripe-webhook.controller.ts) verifies the
  // signature against `req.rawBody` — never `req.body` — because HMAC verification must
  // run over the exact bytes Stripe sent.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Rule 10: cap body size at 256 KB (applies to every route; comfortably above real
  // Stripe payloads, which are typically < 64 KB).
  app.useBodyParser('json', { limit: '256kb' });
  app.useBodyParser('urlencoded', { limit: '256kb', extended: true });

  app.enableCors({
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map((s) => s.trim())
      : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sistema de Citas API')
    .setDescription('API para gestión de citas multi-tenant')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

