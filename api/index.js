'use strict';
/**
 * Vercel serverless entry point.
 * NestJS is pre-compiled by `nest build` (pnpm run build) into /dist.
 * This file imports from the compiled output so Vercel's bundler
 * never has to deal with TypeScript decorators or emitDecoratorMetadata.
 */

require('reflect-metadata');

const path = require('path');
const serverlessHttp = require('serverless-http');

let handler;

module.exports = async (req, res) => {
  if (!handler) {
    const t0 = Date.now();
    console.log('[boot] start');

    const { NestFactory } = require('@nestjs/core');
    console.log('[boot] NestFactory loaded', Date.now() - t0, 'ms');

    const { ValidationPipe } = require('@nestjs/common');
    const { AppModule } = require(path.join(__dirname, '..', 'dist', 'src', 'app.module'));
    console.log('[boot] AppModule loaded', Date.now() - t0, 'ms');

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn'],
    });
    console.log('[boot] NestFactory.create done', Date.now() - t0, 'ms');

    app.enableCors({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    console.log('[boot] app.init done', Date.now() - t0, 'ms');

    handler = serverlessHttp(app.getHttpAdapter().getInstance());
  }

  return handler(req, res);
};
