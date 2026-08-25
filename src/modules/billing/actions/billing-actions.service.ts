import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { StripeService } from '../stripe.service';
import { DatabaseService } from '../../../database/database.service';
import { CancelSubscriptionDto } from '../dto/cancel-subscription.dto';
import { RefundInvoiceDto } from '../dto/refund-invoice.dto';
import { mapStripeError } from '../payment-errors';
import type { IPagokitStripeCustomer, IPagokitSubscription } from '../types';

@Injectable()
export class BillingActionsService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly db: DatabaseService,
  ) {}

  /** Business ADMIN cancels their own business's platform subscription. */
  async cancelSubscription(businessId: string, dto: CancelSubscriptionDto) {
    const subscription = await this.db
      .knex<IPagokitSubscription>('pagokit_subscriptions')
      .where({ business_id: businessId })
      .whereNotIn('status', ['canceled'])
      .orderBy('created_at', 'desc')
      .first();

    if (!subscription) {
      throw new NotFoundException(
        'No hay una suscripción activa para este negocio.',
      );
    }

    const atPeriodEnd = dto.atPeriodEnd ?? true;
    const idempotencyKey = randomUUID(); // Rule 4
    await this.db.knex('pagokit_idempotency_keys').insert({
      idempotency_key: idempotencyKey,
      business_id: businessId,
      endpoint: 'billing.subscription.cancel',
    });

    try {
      const updated: Stripe.Subscription = atPeriodEnd
        ? await this.stripeService.client.subscriptions.update(
            subscription.stripe_subscription_id,
            { cancel_at_period_end: true },
            { idempotencyKey },
          )
        : await this.stripeService.client.subscriptions.cancel(
            subscription.stripe_subscription_id,
            { idempotencyKey } as Stripe.RequestOptions &
              Stripe.SubscriptionCancelParams,
          );

      // The webhook (customer.subscription.updated/deleted) is the source of truth and will
      // reconcile this row again; we also update eagerly for a snappier UI response.
      await this.db
        .knex('pagokit_subscriptions')
        .where({ id: subscription.id })
        .update({
          status: updated.status,
          cancel_at: updated.cancel_at
            ? new Date(updated.cancel_at * 1000)
            : null,
          canceled_at: updated.canceled_at
            ? new Date(updated.canceled_at * 1000)
            : null,
          updated_at: new Date(),
        });

      return {
        status: updated.status,
        cancel_at: updated.cancel_at,
        canceled_at: updated.canceled_at,
      };
    } catch (err) {
      const mapped = mapStripeError(err);
      console.error('[billing.cancel] stripe error', {
        pagokit_code: mapped.code,
        raw_code: mapped.raw_code,
      }); // Rule 6
      throw new InternalServerErrorException({
        error: mapped.code,
        message: mapped.user_message,
      });
    }
  }

  /** Platform SUPER_ADMIN refunds a specific invoice's payment for a business. */
  async refundInvoicePayment(dto: RefundInvoiceDto, refundedByUserId: string) {
    const customer = await this.db
      .knex<IPagokitStripeCustomer>('pagokit_stripe_customers')
      .where({ business_id: dto.businessId })
      .first();
    if (!customer) {
      throw new NotFoundException(
        'Este negocio no tiene una suscripción configurada.',
      );
    }

    const idempotencyKey = randomUUID(); // Rule 4
    await this.db.knex('pagokit_idempotency_keys').insert({
      idempotency_key: idempotencyKey,
      business_id: dto.businessId,
      endpoint: 'billing.refund',
    });

    try {
      const invoice = await this.stripeService.client.invoices.retrieve(
        dto.invoiceId,
      );
      if (invoice.customer !== customer.stripe_customer_id) {
        // Prevent refunding an invoice that doesn't belong to this business.
        throw new NotFoundException('La factura no pertenece a este negocio.');
      }
      const paymentIntentId =
        typeof invoice.payment_intent === 'string'
          ? invoice.payment_intent
          : invoice.payment_intent?.id;
      if (!paymentIntentId) {
        throw new NotFoundException(
          'Esta factura no tiene un pago asociado para reembolsar.',
        );
      }

      const refund = await this.stripeService.client.refunds.create(
        {
          payment_intent: paymentIntentId,
          amount: dto.amount,
          reason: dto.reason,
          metadata: {
            // Rule 11: minimum PII for audit — user id and business id, no extra data.
            refunded_by: refundedByUserId,
            business_id: dto.businessId,
          },
        },
        { idempotencyKey },
      );

      // The charge.refunded webhook is the source of truth for final state; this is just
      // the trigger + immediate response.
      return {
        refund_id: refund.id,
        status: refund.status,
        amount: refund.amount,
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      const mapped = mapStripeError(err);
      console.error('[billing.refund] stripe error', {
        pagokit_code: mapped.code,
        raw_code: mapped.raw_code,
      }); // Rule 6
      throw new InternalServerErrorException({
        error: mapped.code,
        message: mapped.user_message,
      });
    }
  }
}
