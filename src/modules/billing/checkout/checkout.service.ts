import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { StripeService } from '../stripe.service';
import { DatabaseService } from '../../../database/database.service';
import { CreateCheckoutSessionDto } from '../dto/create-checkout-session.dto';
import { mapStripeError } from '../payment-errors';
import type { IPagokitStripeCustomer } from '../types';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async createSubscriptionCheckout(
    businessId: string,
    dto: CreateCheckoutSessionDto,
  ) {
    const priceId = this.resolvePriceId(dto.priceId);

    const customer = await this.findOrCreateStripeCustomer(
      businessId,
      dto.email,
    );

    // Rule 4: idempotency key is a literal crypto.randomUUID() call, sent as Stripe's
    // idempotencyKey and persisted below for merchant-side dedup on retry.
    const idempotencyKey = randomUUID();
    await this.db.knex('pagokit_idempotency_keys').insert({
      idempotency_key: idempotencyKey,
      business_id: businessId,
      endpoint: 'billing.checkout.subscribe',
    });

    const successUrl = this.configService.get<string>(
      'STRIPE_CHECKOUT_SUCCESS_URL',
      'http://localhost:5173/billing/success',
    );
    const cancelUrl = this.configService.get<string>(
      'STRIPE_CHECKOUT_CANCEL_URL',
      'http://localhost:5173/billing/cancel',
    );

    try {
      const session = await this.stripeService.client.checkout.sessions.create(
        {
          mode: 'subscription',
          customer: customer.stripe_customer_id,
          client_reference_id: businessId,
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: successUrl,
          cancel_url: cancelUrl,
          allow_promotion_codes: true,
          subscription_data: {
            // Belt-and-suspenders: webhook resolves business_id primarily via the
            // pagokit_stripe_customers lookup, but metadata helps for support/debugging.
            metadata: { business_id: businessId },
          },
        },
        { idempotencyKey },
      );

      return { url: session.url };
    } catch (err) {
      const mapped = mapStripeError(err);
      // Rule 6: log only the mapped/raw code, never the full Stripe error or its message.
      console.error('[billing.checkout] stripe error', {
        pagokit_code: mapped.code,
        raw_code: mapped.raw_code,
      });
      throw new InternalServerErrorException({
        error: mapped.code,
        message: mapped.user_message,
      });
    }
  }

  private resolvePriceId(requestedPriceId?: string): string {
    const defaultPriceId = this.configService.get<string>(
      'STRIPE_DEFAULT_PRICE_ID',
    );
    const priceId = requestedPriceId || defaultPriceId;
    if (!priceId) {
      throw new BadRequestException(
        'No priceId provided and STRIPE_DEFAULT_PRICE_ID is not set.',
      );
    }

    // Never trust a client-supplied priceId blindly — validate against an operator-controlled
    // allow-list if one is configured.
    const allowList = this.configService
      .get<string>('STRIPE_ALLOWED_PRICE_IDS', '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (allowList.length > 0 && !allowList.includes(priceId)) {
      throw new BadRequestException('priceId is not in the allowed plan list.');
    }

    return priceId;
  }

  private async findOrCreateStripeCustomer(
    businessId: string,
    email: string,
  ): Promise<IPagokitStripeCustomer> {
    const existing = await this.db
      .knex<IPagokitStripeCustomer>('pagokit_stripe_customers')
      .where({ business_id: businessId })
      .first();
    if (existing) return existing;

    // Rule 11: only email + business_id metadata sent to Stripe — no extra PII.
    const stripeCustomer = await this.stripeService.client.customers.create({
      email,
      metadata: { business_id: businessId },
    });

    const [created] = await this.db
      .knex<IPagokitStripeCustomer>('pagokit_stripe_customers')
      .insert({
        business_id: businessId,
        stripe_customer_id: stripeCustomer.id,
        email,
      })
      .returning('*');

    return created;
  }
}
