export interface IPagokitStripeCustomer {
  id: string;
  business_id: string;
  stripe_customer_id: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface IPagokitSubscription {
  id: string;
  business_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  status: string;
  current_period_start: Date | null;
  current_period_end: Date | null;
  cancel_at: Date | null;
  canceled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
