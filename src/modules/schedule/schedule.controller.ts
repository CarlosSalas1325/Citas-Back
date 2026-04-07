import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../database/types';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/schedule.dto';

@ApiTags('Schedule')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  @ApiOperation({ summary: 'List business schedule' })
  findAll(@CurrentUser('businessId') businessId: string) {
    return this.scheduleService.findAll(businessId);
  }

  @Get('available-slots')
  @ApiOperation({ summary: 'Get available time slots for a date and service' })
  getAvailableSlots(
    @CurrentUser('businessId') businessId: string,
    @Query('date') date: string,
    @Query('serviceId') serviceId: string,
  ) {
    return this.scheduleService.getAvailableSlots(businessId, date, serviceId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create schedule entry (ADMIN)' })
  create(@CurrentUser('businessId') businessId: string, @Body() dto: CreateScheduleDto) {
    return this.scheduleService.create(businessId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update schedule entry (ADMIN)' })
  update(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.scheduleService.update(id, businessId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete schedule entry (ADMIN)' })
  remove(@Param('id') id: string, @CurrentUser('businessId') businessId: string) {
    return this.scheduleService.remove(id, businessId);
  }
}
