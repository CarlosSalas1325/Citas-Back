import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { BusinessAccessService } from '../../modules/billing/access/business-access.service';
import type { JwtPayload } from '../../modules/auth/jwt.strategy';

// Paths that must keep working even when a business has no access left — otherwise an
// expired business could neither log in nor reach the page where it pays to come back.
const ALWAYS_ALLOWED = [
  '/auth',
  '/billing',
  '/api/webhook',
  '/businesses', // signup, slug lookup and /me, all needed by the login + shell flows
];

/**
 * Blocks the product surface once the free trial ends without an active subscription.
 *
 * Registered globally, which in Nest means it runs *before* each route's own JWT guard —
 * so `request.user` is not populated yet and this guard decodes the token itself. It never
 * authenticates: an absent or invalid token is simply passed through for the route's real
 * guard to reject, so this can only ever add a restriction, never grant access.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly accessService: BusinessAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path ?? request.url ?? '';
    if (ALWAYS_ALLOWED.some((prefix) => path.startsWith(prefix))) return true;

    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return true;

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(
        header.slice('Bearer '.length),
        { secret: this.configService.get<string>('JWT_SECRET') },
      );
    } catch {
      // Let the route's JWT guard produce the 401 — this guard has no opinion on bad tokens.
      return true;
    }

    if (!payload?.businessId) return true;

    const access = await this.accessService.check(payload.businessId);
    if (access.allowed) return true;

    // 402 rather than 403: the block is about payment, and the client uses this to route the
    // user to the subscription screen instead of showing a generic "forbidden".
    throw new HttpException(
      {
        error: 'subscription_required',
        message:
          'Tu prueba gratuita terminó. Suscríbete para seguir usando la plataforma.',
        state: access.state,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
