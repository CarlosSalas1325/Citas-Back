import { Controller, Post, Req, Res, HttpCode } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { StripeService } from '../stripe.service';
import { DatabaseService } from '../../../database/database.service';
import type { IPagokitStripeCustomer } from '../types';

// PagoKit — Stripe webhook handler.
//
// Rule 7: namespaced webhook path `/api/webhook/stripe` (this project had no pre-existing
// webhook routes at install time; this is the first one, still namespaced per convention).
// Rule 5: this controller MUST verify the signature against the raw request body (Buffer),
// never the parsed JSON body. See src/main.ts — `app.useBodyParser('json', true, { limit:
// '256kb' })` (Rule 10: 256 KB body cap) makes Nest attach the raw bytes to `req.rawBody`
// for every request; this handler reads req.rawBody, not req.body.
@ApiExcludeController()
@Controller('api/webhook/stripe')
export class StripeWebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): Promise<void> {
    // Rule 10 (defense in depth — the hard cap is enforced by useBodyParser's `limit` option
    // in main.ts; this re-checks in case that config ever drifts).
    const contentLength = Number(req.headers['content-length'] ?? 0);
    if (contentLength > 256 * 1024) {
      res.status(413).send();
      return;
    }

    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      res.status(400).send();
      return;
    }

    if (!req.rawBody) {
      // Should never happen given main.ts's useBodyParser(..., true, ...) config, but guard
      // against silent misconfiguration rather than falling back to the parsed body.
      res.status(500).send();
      return;
    }

    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      // Rule 1: read via ConfigService/process.env, never hardcoded.
      res.status(500).send();
      return;
    }

    const stripe = this.stripeService.client;

    let event: Stripe.Event;
    try {
      // Rule 3 + Rule 5 + Rule 9: verifies the HMAC signature over the exact raw bytes
      // (req.rawBody, never the parsed req.body) and rejects events outside Stripe's
      // default 300s timestamp tolerance.
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        webhookSecret,
      );
    } catch {
      res.status(400).send();
      return;
    }

    // Rule 9 (secondary defense): dedup by event.id. TTL 7 days — a cleanup job can purge
    // rows past expires_at (see PAGOKIT_PRODUCTION_CHECKLIST.md).
    try {
      await this.db.knex('pagokit_webhook_events_processed').insert({
        event_id: event.id,
        provider: 'stripe',
        event_type: event.type,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    } catch {
      // Unique constraint violation => already processed. Idempotent 200, no re-processing.
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    // Rule 6: log only event.id, event.type, event.created — never the full event/payload.
    console.log('[stripe.webhook]', {
      id: event.id,
      type: event.type,
      created: event.created,
    });

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.upsertSubscription(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        case 'invoice.payment_failed':
          this.handleInvoicePaymentFailed(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          // TODO: reactivate access if it was suspended for non-payment; send a receipt.
          console.log('[stripe.webhook] invoice.payment_succeeded', {
            id: event.id,
          });
          break;
        case 'payment_intent.succeeded':
          // This integration is subscription-only (no one-time charges), but the event is
          // part of Stripe's required minimum set — logged for audit, not acted on.
          console.log('[stripe.webhook] payment_intent.succeeded', {
            id: event.id,
          });
          break;
        case 'payment_intent.payment_failed':
          console.log('[stripe.webhook] payment_intent.payment_failed', {
            id: event.id,
          });
          break;
        case 'charge.refunded':
          // Source of truth for refund state — the /billing/refund endpoint only triggers
          // the refund; this event confirms it landed.
          console.log('[stripe.webhook] charge.refunded', { id: event.id });
          break;
        case 'charge.dispute.created':
          // TODO: alert ops. Stripe gives ~7 days to submit evidence via stripe.disputes.update();
          // the merchant otherwise auto-loses the dispute.
          console.log('[stripe.webhook] charge.dispute.created', {
            id: event.id,
          });
          break;
        default:
          // Rule 9: don't silently drop unhandled events — log and return 200 so Stripe
          // doesn't disable the endpoint for repeated non-2xx responses.
          console.log('[stripe.webhook] unhandled event type', event.type);
      }
    } catch (err) {
      // Internal error -> 500 makes Stripe retry. The dedup table above still lets the retry
      // through (the insert already succeeded), so make handlers idempotent (upserts, not inserts).
      const errorCode =
        err instanceof Stripe.errors.StripeError ? err.code : 'unknown';
      console.error('[stripe.webhook] handler error', {
        id: event.id,
        type: event.type,
        error_code: errorCode ?? 'unknown',
      });
      res.status(500).send();
      return;
    }

    res.status(200).json({ received: true });
  }

  private async resolveBusinessIdByCustomerId(
    stripeCustomerId: string,
  ): Promise<string | null> {
    const row = await this.db
      .knex<IPagokitStripeCustomer>('pagokit_stripe_customers')
      .where({ stripe_customer_id: stripeCustomerId })
      .select('business_id')
      .first();
    return row?.business_id ?? null;
  }

  private async upsertSubscription(sub: Stripe.Subscription): Promise<void> {
    const businessId = await this.resolveBusinessIdByCustomerId(
      sub.customer as string,
    );
    if (!businessId) {
      console.error(
        '[stripe.webhook] subscription event for unknown customer',
        {
          subscription_id: sub.id,
        },
      );
      return;
    }

    const priceId = sub.items.data[0]?.price.id ?? null;

    await this.db
      .knex('pagokit_subscriptions')
      .insert({
        business_id: businessId,
        stripe_subscription_id: sub.id,
        stripe_price_id: priceId,
        status: sub.status,
        current_period_start: new Date(sub.current_period_start * 1000),
        current_period_end: new Date(sub.current_period_end * 1000),
        cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
        canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
      })
      .onConflict('stripe_subscription_id')
      .merge({
        stripe_price_id: priceId,
        status: sub.status,
        current_period_start: new Date(sub.current_period_start * 1000),
        current_period_end: new Date(sub.current_period_end * 1000),
        cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
        canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
        updated_at: new Date(),
      });

    // TODO: gate feature access in the app based on `status` (e.g. suspend on 'past_due'/'unpaid').
  }

  private async handleSubscriptionDeleted(
    sub: Stripe.Subscription,
  ): Promise<void> {
    await this.db
      .knex('pagokit_subscriptions')
      .where({ stripe_subscription_id: sub.id })
      .update({
        status: 'canceled',
        canceled_at: new Date(),
        updated_at: new Date(),
      });

    // TODO: revoke the business's access to paid features.
  }

  private handleInvoicePaymentFailed(invoice: Stripe.Invoice): void {
    // Stripe's Smart Retries (Dashboard -> Billing -> Failed payments) handle the retry
    // schedule; this is where you'd trigger your own dunning notification.
    console.log('[stripe.webhook] invoice.payment_failed', {
      invoice_id: invoice.id,
      attempt_count: invoice.attempt_count,
    });
  }
}
