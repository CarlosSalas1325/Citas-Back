import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/schedule.dto';
import type { IBusinessSchedule, IAppointment, IService } from '../../database/types';
import { AppointmentStatus } from '../../database/types';

@Injectable()
export class ScheduleService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(businessId: string) {
    const schedules = await this.db.knex<IBusinessSchedule>('business_schedules')
      .where({ business_id: businessId })
      .orderBy('day_of_week', 'asc');

    return schedules.map((s) => ({
      id: s.id,
      dayOfWeek: s.day_of_week,
      openTime: s.open_time,
      closeTime: s.close_time,
      isActive: s.is_active,
    }));
  }

  async create(businessId: string, dto: CreateScheduleDto) {
    const existing = await this.db.knex<IBusinessSchedule>('business_schedules')
      .where({ business_id: businessId, day_of_week: dto.dayOfWeek })
      .first();

    if (existing) {
      throw new ConflictException('Ya existe un horario para ese día');
    }

    const [schedule] = await this.db.knex<IBusinessSchedule>('business_schedules')
      .insert({
        business_id: businessId,
        day_of_week: dto.dayOfWeek,
        open_time: dto.openTime,
        close_time: dto.closeTime,
      })
      .returning('*');

    return {
      id: schedule.id,
      dayOfWeek: schedule.day_of_week,
      openTime: schedule.open_time,
      closeTime: schedule.close_time,
    };
  }

  async update(id: string, businessId: string, dto: UpdateScheduleDto) {
    const updateData: Record<string, unknown> = {};
    if (dto.openTime !== undefined) updateData.open_time = dto.openTime;
    if (dto.closeTime !== undefined) updateData.close_time = dto.closeTime;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    const [schedule] = await this.db.knex<IBusinessSchedule>('business_schedules')
      .where({ id, business_id: businessId })
      .update(updateData)
      .returning('*');

    if (!schedule) throw new NotFoundException('Horario no encontrado');
    return {
      id: schedule.id,
      dayOfWeek: schedule.day_of_week,
      openTime: schedule.open_time,
      closeTime: schedule.close_time,
      isActive: schedule.is_active,
    };
  }

  async remove(id: string, businessId: string) {
    const deleted = await this.db.knex<IBusinessSchedule>('business_schedules')
      .where({ id, business_id: businessId })
      .del();

    if (!deleted) throw new NotFoundException('Horario no encontrado');
    return { message: 'Eliminado' };
  }

  async getAvailableSlots(businessId: string, date: string, serviceId: string) {
    const service = await this.db.knex<IService>('services')
      .where({ id: serviceId, business_id: businessId })
      .first();

    if (!service) throw new NotFoundException('Servicio no encontrado');

    const dayDate = new Date(date);
    const dayOfWeek = dayDate.getUTCDay();

    const schedule = await this.db.knex<IBusinessSchedule>('business_schedules')
      .where({ business_id: businessId, day_of_week: dayOfWeek, is_active: true })
      .first();

    if (!schedule) return [];

    // Get existing appointments for that date
    const dayStart = new Date(date + 'T00:00:00');
    const dayEnd = new Date(date + 'T23:59:59');

    const booked = await this.db.knex<IAppointment>('appointments')
      .where({ 'appointments.business_id': businessId })
      .whereIn('status', [AppointmentStatus.PENDIENTE, AppointmentStatus.CONFIRMADA])
      .whereBetween('date_time', [dayStart.toISOString(), dayEnd.toISOString()])
      .join('services', 'appointments.service_id', 'services.id')
      .select('appointments.date_time', 'services.duration');

    // Generate slots in 30-minute intervals
    const [openH, openM] = schedule.open_time.split(':').map(Number);
    const [closeH, closeM] = schedule.close_time.split(':').map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    const slotDuration = service.duration;

    const slots: { time: string; available: boolean }[] = [];

    for (let m = openMinutes; m + slotDuration <= closeMinutes; m += 30) {
      const slotStart = new Date(date + 'T00:00:00');
      slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);

      const hasConflict = booked.some((b) => {
        const bStart = new Date(b.date_time);
        const bEnd = new Date(bStart.getTime() + b.duration * 60000);
        return slotStart < bEnd && slotEnd > bStart;
      });

      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      slots.push({ time: `${hh}:${mm}`, available: !hasConflict });
    }

    return slots;
  }
}
