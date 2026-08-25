import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../../common/decorators';
import { Role } from '../../../database/types';
import { SubscriptionService } from './subscription.service';

@ApiTags('Billing')
@Controller('billing/subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Current platform subscription state + recent invoices for the business',
  })
  getSubscription(@CurrentUser('businessId') businessId: string) {
    return this.subscriptionService.getForBusiness(businessId);
  }
}
