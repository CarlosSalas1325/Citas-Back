import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type { IBusiness } from '../../../database/types';
import type { IPagokitSubscription } from '../types';

export type AccessState = 'trial' | 'subscribed' | 'expired';

export interface BusinessAccess {
  state: AccessState;
  allowed: boolean;
  /** Whole days left in the trial; 0 once it has run out. Only meaningful while trialing. */
  trialDaysLeft: number;
  trialEndsAt: Date | null;
  subscriptionStatus: string | null;
}

// Stripe states that still entitle a business to use the product. 'past_due' is deliberately
// included: the card failed but Stripe is still retrying, and locking the business out mid
// dunning would punish them for a transient payment problem. 'unpaid' is where Stripe gives
// up, and that does end access.
const ENTITLED_STATUSES = new Set(['active', 'trialing', 'past_due']);

/**
 * Single source of truth for "can this business use the app right now".
 *
 * Consulted both by the guard that blocks API calls and by the billing screen that explains
 * the situation to the user, so the two can never disagree.
 */
@Injectable()
export class BusinessAccessService {
  constructor(private readonly db: DatabaseService) {}

  async check(businessId: string): Promise<BusinessAccess> {
    const business = await this.db
      .knex<IBusiness>('businesses')
      .where({ id: businessId })
      .first();

    const subscription = await this.db
      .knex<IPagokitSubscription>('pagokit_subscriptions')
      .where({ business_id: businessId })
      .orderBy('created_at', 'desc')
      .first();

    const subscriptionStatus = subscription?.status ?? null;
    const trialEndsAt = business?.trial_ends_at
      ? new Date(business.trial_ends_at)
      : null;

    if (subscriptionStatus && ENTITLED_STATUSES.has(subscriptionStatus)) {
      return {
        state: 'subscribed',
        allowed: true,
        trialDaysLeft: 0,
        trialEndsAt,
        subscriptionStatus,
      };
    }

    const now = Date.now();
    if (trialEndsAt && trialEndsAt.getTime() > now) {
      return {
        state: 'trial',
        allowed: true,
        trialDaysLeft: Math.ceil((trialEndsAt.getTime() - now) / 86_400_000),
        trialEndsAt,
        subscriptionStatus,
      };
    }

    return {
      state: 'expired',
      allowed: false,
      trialDaysLeft: 0,
      trialEndsAt,
      subscriptionStatus,
    };
  }
}
