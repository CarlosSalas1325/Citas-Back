import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../../common/decorators';
import { Role } from '../../../database/types';
import { BillingActionsService } from './billing-actions.service';
import { CancelSubscriptionDto } from '../dto/cancel-subscription.dto';
import { RefundInvoiceDto } from '../dto/refund-invoice.dto';

@ApiTags('Billing')
@Controller('billing')
export class BillingActionsController {
  constructor(private readonly billingActionsService: BillingActionsService) {}

  @Post('cancel')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel the current business platform subscription',
  })
  cancelSubscription(
    @CurrentUser('businessId') businessId: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.billingActionsService.cancelSubscription(businessId, dto);
  }

  @Post('refund')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN) // platform-level action — only PagoKit's own platform operators
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Refund a specific invoice payment for a business (SUPER_ADMIN only)',
  })
  refundInvoice(
    @CurrentUser('id') userId: string,
    @Body() dto: RefundInvoiceDto,
  ) {
    return this.billingActionsService.refundInvoicePayment(dto, userId);
  }
}
