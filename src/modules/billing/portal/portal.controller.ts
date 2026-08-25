import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../../common/decorators';
import { Role } from '../../../database/types';
import { PortalService } from './portal.service';

@ApiTags('Billing')
@Controller('billing/portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Open the Stripe Billing Portal for the current business subscription',
  })
  createPortalSession(@CurrentUser('businessId') businessId: string) {
    return this.portalService.createPortalSession(businessId);
  }
}
