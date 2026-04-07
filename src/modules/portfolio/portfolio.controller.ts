import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../database/types';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioDto, UpdatePortfolioDto } from './dto/portfolio.dto';

@ApiTags('Portfolio')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  @ApiOperation({ summary: 'List active portfolio entries' })
  findAll(@CurrentUser('businessId') businessId: string) {
    return this.portfolioService.findAllPublic(businessId);
  }

  @Get('manage')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PROFESIONAL)
  @ApiOperation({ summary: 'List all portfolio entries for management' })
  findAllManage(@CurrentUser('businessId') businessId: string) {
    return this.portfolioService.findAll(businessId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PROFESIONAL)
  @ApiOperation({ summary: 'Create portfolio entry' })
  create(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreatePortfolioDto,
  ) {
    return this.portfolioService.create(businessId, userId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PROFESIONAL)
  @ApiOperation({ summary: 'Update portfolio entry' })
  update(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @Body() dto: UpdatePortfolioDto,
  ) {
    return this.portfolioService.update(id, businessId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PROFESIONAL)
  @ApiOperation({ summary: 'Delete portfolio entry' })
  remove(@Param('id') id: string, @CurrentUser('businessId') businessId: string) {
    return this.portfolioService.remove(id, businessId);
  }
}
