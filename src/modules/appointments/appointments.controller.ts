import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../database/types';
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  CompleteAppointmentDto,
} from './dto/appointment.dto';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all appointments' })
  findAll(@CurrentUser('businessId') businessId: string) {
    return this.appointmentsService.findAll(businessId);
  }

  @Get('my')
  @ApiOperation({ summary: 'List my appointments (patient)' })
  findMy(@CurrentUser('id') userId: string, @CurrentUser('businessId') businessId: string) {
    return this.appointmentsService.findByPatient(businessId, userId);
  }

  @Get('today')
  @ApiOperation({ summary: 'List today appointments' })
  findToday(@CurrentUser('businessId') businessId: string) {
    return this.appointmentsService.findToday(businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  findById(@Param('id') id: string, @CurrentUser('businessId') businessId: string) {
    return this.appointmentsService.findById(id, businessId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PROFESIONAL, Role.RECEPCIONISTA, Role.CLIENTE, Role.PACIENTE)
  @ApiOperation({ summary: 'Create appointment' })
  create(@CurrentUser('businessId') businessId: string, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(businessId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PROFESIONAL, Role.RECEPCIONISTA)
  @ApiOperation({ summary: 'Update appointment' })
  update(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(id, businessId, dto);
  }

  @Post(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PROFESIONAL)
  @ApiOperation({ summary: 'Complete appointment (deducts stock)' })
  complete(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @Body() dto: CompleteAppointmentDto,
  ) {
    return this.appointmentsService.complete(id, businessId, dto);
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.RECEPCIONISTA)
  @ApiOperation({ summary: 'Cancel appointment' })
  cancel(@Param('id') id: string, @CurrentUser('businessId') businessId: string) {
    return this.appointmentsService.cancel(id, businessId);
  }
}
