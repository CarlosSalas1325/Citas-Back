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

    // Parse date parts to avoid UTC vs local timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();

    const schedule = await this.db.knex<IBusinessSchedule>('business_schedules')
      .where({ business_id: businessId, day_of_week: dayOfWeek, is_active: true })
      .first();

    if (!schedule) return [];

    // Get all professionals for this business
    const professionals = await this.db.knex('users')
      .where({ business_id: businessId, role: 'PROFESIONAL' })
      .select('id', 'name');

    if (professionals.length === 0) return [];

    // Get existing appointments for that date using PostgreSQL date cast (no TZ shift)
    const booked = await this.db.knex<IAppointment>('appointments')
      .where({ 'appointments.business_id': businessId })
      .whereIn('status', [AppointmentStatus.PENDIENTE, AppointmentStatus.CONFIRMADA])
      .whereRaw('date_time::date = ?', [date])
      .join('services', 'appointments.service_id', 'services.id')
      .select('appointments.date_time', 'appointments.professional_id', 'services.duration');

    // Generate slots in 30-minute intervals
    const [openH, openM] = schedule.open_time.split(':').map(Number);
    const [closeH, closeM] = schedule.close_time.split(':').map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    const slotDuration = service.duration;

    // Pre-parse booked appointments into minutes-from-midnight for comparison.
    // Parse time directly from the string to avoid any Date/timezone issues.
    const bookedRanges = booked.map((b) => {
      const dtStr = String(b.date_time); // e.g. '2026-04-09 16:30:00' or '2026-04-09T16:30:00'
      const timePart = dtStr.substring(11, 16); // 'HH:mm'
      const [bH, bM] = timePart.split(':').map(Number);
      const bStartMin = bH * 60 + bM;
      const bEndMin = bStartMin + b.duration;
      return { professionalId: b.professional_id, startMin: bStartMin, endMin: bEndMin };
    });

    const slots: { time: string; available: boolean; professionalId?: string; professionalName?: string }[] = [];

    for (let m = openMinutes; m + slotDuration <= closeMinutes; m += 30) {
      const slotStartMin = m;
      const slotEndMin = m + slotDuration;

      // Find a professional who is free at this time
      let availableProfessional: { id: string; name: string } | null = null;
      for (const prof of professionals) {
        const hasConflict = bookedRanges.some((br) => {
          if (br.professionalId !== prof.id) return false;
          return slotStartMin < br.endMin && slotEndMin > br.startMin;
        });
        if (!hasConflict) {
          availableProfessional = prof;
          break;
        }
      }

      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      slots.push({
        time: `${hh}:${mm}`,
        available: availableProfessional !== null,
        professionalId: availableProfessional?.id,
        professionalName: availableProfessional?.name,
      });
    }

    return slots;
  }
}
