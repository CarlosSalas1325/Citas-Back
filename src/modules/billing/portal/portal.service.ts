import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripeService } from '../stripe.service';
import { DatabaseService } from '../../../database/database.service';
import type { IPagokitStripeCustomer } from '../types';

@Injectable()
export class PortalService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async createPortalSession(businessId: string) {
    const customer = await this.db
      .knex<IPagokitStripeCustomer>('pagokit_stripe_customers')
      .where({ business_id: businessId })
      .first();

    if (!customer) {
      throw new NotFoundException(
        'Este negocio no tiene una suscripción configurada todavía.',
      );
    }

    const returnUrl = this.configService.get<string>(
      'STRIPE_PORTAL_RETURN_URL',
      'http://localhost:5173/billing',
    );

    // No idempotencyKey here — billingPortal.sessions.create is meant to be created fresh
    // per click; Stripe expires unused sessions, so a double-click is harmless.
    const session =
      await this.stripeService.client.billingPortal.sessions.create({
        customer: customer.stripe_customer_id,
        return_url: returnUrl,
      });

    return { url: session.url };
  }
}
