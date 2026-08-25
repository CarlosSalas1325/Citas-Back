'use strict';
/**
 * Vercel serverless entry point.
 *
 * NestJS is pre-compiled by `nest build` (pnpm run build) into /dist. This file imports from
 * the compiled output so Vercel's bundler never has to deal with TypeScript decorators or
 * emitDecoratorMetadata.
 *
 * The Express instance Nest wraps is itself a (req, res) handler, and Vercel's Node runtime
 * hands us real Node request/response objects — so the request is passed straight through.
 * (An adapter like serverless-http is for AWS Lambda's event/context shape; feeding it Node
 * objects leaves the body stream unread and every request arrives with 0 bytes.)
 *
 * IMPORTANT: this must stay in sync with src/main.ts. Anything configured there and not here
 * simply does not exist in production — most critically `rawBody: true`, without which the
 * Stripe webhook cannot verify signatures and rejects every event.
 */

require('reflect-metadata');

const path = require('path');

// Cached across invocations that reuse the same warm instance, so only a cold start pays
// the Nest bootstrap cost. Storing the promise (not the app) means concurrent requests
// arriving during a cold start all await the same bootstrap instead of racing to run it.
let bootstrapPromise;

async function bootstrap() {
  const t0 = Date.now();
  console.log('[boot] start');

  const { NestFactory } = require('@nestjs/core');
  const { ValidationPipe } = require('@nestjs/common');
  const { AppModule } = require(path.join(__dirname, '..', 'dist', 'src', 'app.module'));
  console.log('[boot] modules loaded', Date.now() - t0, 'ms');

  // Rule 5: `rawBody: true` keeps the exact bytes of the request on `req.rawBody`, which the
  // Stripe webhook verifies the HMAC signature against. Re-serialising the parsed JSON would
  // change the bytes and every signature check would fail.
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: ['error', 'warn'],
  });

  // Rule 10: same 256 KB cap as src/main.ts (well above real Stripe payloads).
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

  await app.init();
  console.log('[boot] ready', Date.now() - t0, 'ms');

  return app.getHttpAdapter().getInstance();
}

module.exports = async (req, res) => {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap().catch((err) => {
      // Clear the cache so the next invocation retries instead of being stuck with a
      // permanently rejected promise.
      bootstrapPromise = undefined;
      throw err;
    });
  }

  const expressApp = await bootstrapPromise;
  return expressApp(req, res);
};
