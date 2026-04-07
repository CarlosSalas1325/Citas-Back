import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../database/types';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

@ApiTags('Services')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'List all services' })
  findAll(@CurrentUser('businessId') businessId: string) {
    return this.servicesService.findAll(businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID' })
  findById(@Param('id') id: string, @CurrentUser('businessId') businessId: string) {
    return this.servicesService.findById(id, businessId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create service (ADMIN only)' })
  create(@CurrentUser('businessId') businessId: string, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(businessId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update service (ADMIN only)' })
  update(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, businessId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete service (ADMIN only)' })
  remove(@Param('id') id: string, @CurrentUser('businessId') businessId: string) {
    return this.servicesService.remove(id, businessId);
  }
}
