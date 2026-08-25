import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../../common/decorators';
import { Role } from '../../../database/types';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutSessionDto } from '../dto/create-checkout-session.dto';

// Platform billing: a business ADMIN starts (or restarts) the business's subscription
// to the SaaS itself — NOT related to appointment/service payments made by patients.
@ApiTags('Billing')
@Controller('billing/checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create a Stripe Checkout session for the platform subscription (hosted)',
  })
  createCheckout(
    @CurrentUser('businessId') businessId: string,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.checkoutService.createSubscriptionCheckout(businessId, dto);
  }
}
