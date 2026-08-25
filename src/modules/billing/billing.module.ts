import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeWebhookController } from './webhook/stripe-webhook.controller';
import { CheckoutController } from './checkout/checkout.controller';
import { CheckoutService } from './checkout/checkout.service';
import { PortalController } from './portal/portal.controller';
import { PortalService } from './portal/portal.service';
import { BillingActionsController } from './actions/billing-actions.controller';
import { BillingActionsService } from './actions/billing-actions.service';
import { SubscriptionController } from './subscription/subscription.controller';
import { SubscriptionService } from './subscription/subscription.service';
import { BusinessAccessService } from './access/business-access.service';

// PagoKit — platform billing module. Handles the business's subscription to this SaaS
// (NOT payments made by end customers for appointments/services).
@Module({
  controllers: [
    StripeWebhookController,
    CheckoutController,
    PortalController,
    BillingActionsController,
    SubscriptionController,
  ],
  providers: [
    StripeService,
    CheckoutService,
    PortalService,
    BillingActionsService,
    SubscriptionService,
    BusinessAccessService,
  ],
  exports: [StripeService, BusinessAccessService],
})
export class BillingModule {}
