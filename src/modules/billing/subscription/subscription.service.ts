import { Injectable } from '@nestjs/common';
import { StripeService } from '../stripe.service';
import { DatabaseService } from '../../../database/database.service';
import { BusinessAccessService } from '../access/business-access.service';
import type { IPagokitStripeCustomer, IPagokitSubscription } from '../types';

// Read model for the billing screen. Everything the UI needs to decide what to render —
// "never subscribed", "active", "canceling at period end", "payment failed" — plus the
// invoice history, in one call.
//
// Local rows are the source of truth for subscription state (the webhook keeps them
// current). Invoices are not mirrored locally, so those are read from Stripe on demand.
@Injectable()
export class SubscriptionService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly db: DatabaseService,
    private readonly accessService: BusinessAccessService,
  ) {}

  async getForBusiness(businessId: string) {
    const customer = await this.db
      .knex<IPagokitStripeCustomer>('pagokit_stripe_customers')
      .where({ business_id: businessId })
      .first();

    const subscription = await this.db
      .knex<IPagokitSubscription>('pagokit_subscriptions')
      .where({ business_id: businessId })
      .orderBy('created_at', 'desc')
      .first();

    // Same computation the guard uses, so the screen can never claim access the API denies.
    const access = await this.accessService.check(businessId);

    if (!subscription) {
      return {
        hasSubscription: false,
        billingEmail: customer?.email ?? null,
        access,
        subscription: null,
        invoices: [],
      };
    }

    return {
      hasSubscription: true,
      billingEmail: customer?.email ?? null,
      access,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        priceId: subscription.stripe_price_id,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAt: subscription.cancel_at,
        canceledAt: subscription.canceled_at,
        // Stripe keeps status 'active' while a subscription is winding down, so the UI
        // cannot tell "renewing" from "ends on the 30th" by status alone.
        cancelAtPeriodEnd: Boolean(
          subscription.cancel_at && subscription.status !== 'canceled',
        ),
      },
      invoices: customer
        ? await this.listInvoices(customer.stripe_customer_id)
        : [],
    };
  }

  private async listInvoices(stripeCustomerId: string) {
    try {
      const invoices = await this.stripeService.client.invoices.list({
        customer: stripeCustomerId,
        limit: 12,
      });

      return invoices.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amountPaid: invoice.amount_paid,
        amountDue: invoice.amount_due,
        currency: invoice.currency,
        created: invoice.created,
        // Stripe-hosted links: we never render or store card data ourselves (Rule 12).
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
      }));
    } catch (err) {
      // Invoice history is supporting detail — a Stripe hiccup here should not blank out
      // the subscription state the page is really about.
      console.error('[billing.subscription] could not list invoices', {
        error_type: err instanceof Error ? err.name : 'unknown',
      }); // Rule 6: no payload/PII in logs
      return [];
    }
  }
}
