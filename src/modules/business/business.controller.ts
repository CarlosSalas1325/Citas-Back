import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../database/types';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/business.dto';

@ApiTags('Businesses')
@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new business with initial admin' })
  create(@Body() dto: CreateBusinessDto) {
    return this.businessService.create(dto);
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Get business by slug (public, for registration)' })
  findBySlug(@Param('slug') slug: string) {
    return this.businessService.findBySlug(slug);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user business' })
  findMyBusiness(@CurrentUser('businessId') businessId: string) {
    return this.businessService.findMyBusiness(businessId);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all businesses (SUPER_ADMIN only)' })
  findAll() {
    return this.businessService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get business by ID' })
  findById(@Param('id') id: string) {
    return this.businessService.findById(id);
  }
}
