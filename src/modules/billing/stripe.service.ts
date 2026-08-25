import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

// PagoKit — Stripe SDK client, memoized as a singleton Nest provider (constructed once at
// module init, reused across requests — never `new Stripe(...)` inside a request handler).
@Injectable()
export class StripeService {
  readonly client: Stripe;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      // Rule 1: keys are read via process.env (ConfigService), never hardcoded.
      throw new Error('STRIPE_SECRET_KEY is not set. See .env.example.');
    }

    this.client = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia', // pinned explicitly so SDK upgrades don't silently change behavior
      typescript: true,
    });
  }
}
