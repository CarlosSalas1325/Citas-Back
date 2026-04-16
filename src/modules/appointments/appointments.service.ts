import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  CompleteAppointmentDto,
} from './dto/appointment.dto';
import type { IAppointment, IService, IServiceProduct, IProduct } from '../../database/types';
import { AppointmentStatus } from '../../database/types';

@Injectable()
export class AppointmentsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(businessId: string) {
    const appointments = await this.db
      .knex<IAppointment>('appointments')
      .where({ 'appointments.business_id': businessId })
      .join('users as patient', 'appointments.patient_id', 'patient.id')
      .join('users as professional', 'appointments.professional_id', 'professional.id')
      .join('services', 'appointments.service_id', 'services.id')
      .select(
        'appointments.*',
        'patient.name as patient_name',
        'patient.phone as patient_phone',
        'professional.name as professional_name',
        'services.name as service_name',
        'services.price as service_price',
        'services.duration as service_duration',
      )
      .orderBy('appointments.date_time', 'desc');

    return appointments.map((a) => this.toResponse(a));
  }

  async findToday(businessId: string) {
    const appointments = await this.db
      .knex<IAppointment>('appointments')
      .where({ 'appointments.business_id': businessId })
      .whereRaw('appointments.date_time::date = CURRENT_DATE')
      .join('users as patient', 'appointments.patient_id', 'patient.id')
      .join('users as professional', 'appointments.professional_id', 'professional.id')
      .join('services', 'appointments.service_id', 'services.id')
      .select(
        'appointments.*',
        'patient.name as patient_name',
        'patient.phone as patient_phone',
        'professional.name as professional_name',
        'services.name as service_name',
        'services.price as service_price',
        'services.duration as service_duration',
      )
      .orderBy('appointments.date_time', 'asc');

    return appointments.map((a) => this.toResponse(a));
  }

  async findByPatient(businessId: string, patientId: string) {
    const appointments = await this.db
      .knex<IAppointment>('appointments')
      .where({ 'appointments.business_id': businessId, 'appointments.patient_id': patientId })
      .join('users as professional', 'appointments.professional_id', 'professional.id')
      .join('services', 'appointments.service_id', 'services.id')
      .select(
        'appointments.*',
        'professional.name as professional_name',
        'services.name as service_name',
        'services.price as service_price',
        'services.duration as service_duration',
      )
      .orderBy('appointments.date_time', 'desc');

    return appointments.map((a) => this.toResponse(a));
  }

  async findById(id: string, businessId: string) {
    const appointment = await this.db
      .knex<IAppointment>('appointments')
      .where({ 'appointments.id': id, 'appointments.business_id': businessId })
      .join('users as patient', 'appointments.patient_id', 'patient.id')
      .join('users as professional', 'appointments.professional_id', 'professional.id')
      .join('services', 'appointments.service_id', 'services.id')
      .select(
        'appointments.*',
        'patient.name as patient_name',
        'patient.phone as patient_phone',
        'professional.name as professional_name',
        'services.name as service_name',
        'services.price as service_price',
        'services.duration as service_duration',
      )
      .first();

    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    const extraProducts = await this.db
      .knex('appointment_products')
      .join('products', 'appointment_products.product_id', 'products.id')
      .where({ appointment_id: id })
      .select('appointment_products.*', 'products.name as product_name', 'products.price as product_price');

    return {
      ...this.toResponse(appointment),
      extraProducts: extraProducts.map((ep) => ({
        id: ep.id,
        productId: ep.product_id,
        productName: ep.product_name,
        quantity: ep.quantity,
        unitPrice: Number(ep.unit_price),
        productPrice: Number(ep.product_price),
      })),
    };
  }

  async create(businessId: string, dto: CreateAppointmentDto) {
    // Get service to check duration for overlap validation
    const service = await this.db.knex<IService>('services')
      .where({ id: dto.serviceId, business_id: businessId })
      .first();

    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    // Overlap check for the professional — use local time strings, no UTC conversion
    const overlapping = await this.db.knex<IAppointment>('appointments')
      .where({ professional_id: dto.professionalId, business_id: businessId })
      .whereIn('status', [AppointmentStatus.PENDIENTE, AppointmentStatus.CONFIRMADA])
      .whereRaw(
        `date_time < ?::timestamp + ? * interval '1 minute'`,
        [dto.dateTime, service.duration],
      )
      .whereRaw(
        `date_time + (SELECT duration FROM services WHERE id = appointments.service_id) * interval '1 minute' > ?::timestamp`,
        [dto.dateTime],
      )
      .first();

    if (overlapping) {
      throw new ConflictException(
        'El profesional ya tiene una cita en ese horario',
      );
    }

    const [appointment] = await this.db.knex<IAppointment>('appointments')
      .insert({
        business_id: businessId,
        patient_id: dto.patientId,
        professional_id: dto.professionalId,
        service_id: dto.serviceId,
        date_time: dto.dateTime as unknown as Date,
        notes: dto.notes || undefined,
        total_price: service.price,
        status: AppointmentStatus.PENDIENTE,
      })
      .returning('*');

    return { id: appointment.id, status: appointment.status, dateTime: appointment.date_time };
  }

  async complete(id: string, businessId: string, dto: CompleteAppointmentDto) {
    return this.db.knex.transaction(async (trx) => {
      const appointment = await trx<IAppointment>('appointments')
        .where({ id, business_id: businessId })
        .first();

      if (!appointment) {
        throw new NotFoundException('Cita no encontrada');
      }

      if (appointment.status === AppointmentStatus.COMPLETADA) {
        throw new BadRequestException('La cita ya fue completada');
      }

      if (appointment.status === AppointmentStatus.CANCELADA) {
        throw new BadRequestException('No se puede completar una cita cancelada');
      }

      // 1. Get service products (materials used for the service)
      const serviceProducts = await trx<IServiceProduct>('service_products')
        .where({ service_id: appointment.service_id });

      // 2. Deduct stock for each service product
      for (const sp of serviceProducts) {
        const product = await trx<IProduct>('products')
          .where({ id: sp.product_id })
          .first();

        if (!product) {
          throw new NotFoundException(`Producto ${sp.product_id} no encontrado`);
        }

        if (product.stock < sp.quantity_used) {
          throw new BadRequestException(
            `Stock insuficiente para "${product.name}". Necesario: ${sp.quantity_used}, disponible: ${product.stock}`,
          );
        }

        await trx<IProduct>('products')
          .where({ id: sp.product_id })
          .update({ stock: product.stock - sp.quantity_used });
      }

      // 3. Handle extra products added during the appointment
      let extraTotal = 0;
      if (dto.extraProducts?.length) {
        for (const ep of dto.extraProducts) {
          const product = await trx<IProduct>('products')
            .where({ id: ep.productId, business_id: businessId })
            .first();

          if (!product) {
            throw new NotFoundException(`Producto extra ${ep.productId} no encontrado`);
          }

          if (product.stock < ep.quantity) {
            throw new BadRequestException(
              `Stock insuficiente para "${product.name}". Necesario: ${ep.quantity}, disponible: ${product.stock}`,
            );
          }

          await trx<IProduct>('products')
            .where({ id: ep.productId })
            .update({ stock: product.stock - ep.quantity });

          await trx('appointment_products').insert({
            appointment_id: id,
            product_id: ep.productId,
            quantity: ep.quantity,
            unit_price: product.price,
          });

          extraTotal += Number(product.price) * ep.quantity;
        }
      }

      // 4. Update appointment status and total
      const newTotal = Number(appointment.total_price) + extraTotal;
      const updateData: Record<string, unknown> = {
        status: AppointmentStatus.COMPLETADA,
        total_price: newTotal,
      };
      if (dto.notes) {
        updateData.notes = dto.notes;
      }

      const [updated] = await trx<IAppointment>('appointments')
        .where({ id })
        .update(updateData)
        .returning('*');

      return {
        id: updated.id,
        status: updated.status,
        totalPrice: Number(updated.total_price),
        message: 'Cita completada exitosamente',
      };
    });
  }

  async update(id: string, businessId: string, dto: UpdateAppointmentDto) {
    const updateData: Record<string, unknown> = {};
    if (dto.dateTime !== undefined) updateData.date_time = dto.dateTime;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.status !== undefined) updateData.status = dto.status;

    const [appointment] = await this.db.knex<IAppointment>('appointments')
      .where({ id, business_id: businessId })
      .update(updateData)
      .returning('*');

    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    return {
      id: appointment.id,
      status: appointment.status,
      dateTime: appointment.date_time,
    };
  }

  async cancel(id: string, businessId: string) {
    const [appointment] = await this.db.knex<IAppointment>('appointments')
      .where({ id, business_id: businessId })
      .update({ status: AppointmentStatus.CANCELADA })
      .returning('*');

    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    return { id: appointment.id, status: appointment.status, message: 'Cita cancelada' };
  }

  /** Convert a pg timestamp string '2026-04-09 16:30:00' → '2026-04-09T16:30:00' (no Z) */
  private normalizeDateTime(dt: string | Date | null | undefined): string {
    if (!dt) return dt as string;
    const s = dt instanceof Date
      ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:00`
      : String(dt);
    return s.replace(' ', 'T').substring(0, 19);
  }

  private toResponse(row: any) {
    return {
      id: row.id,
      businessId: row.business_id,
      patientId: row.patient_id,
      professionalId: row.professional_id,
      serviceId: row.service_id,
      dateTime: this.normalizeDateTime(row.date_time),
      status: row.status,
      totalPrice: Number(row.total_price),
      notes: row.notes,
      createdAt: row.created_at,
      patient: row.patient_name
        ? { name: row.patient_name, phone: row.patient_phone }
        : undefined,
      professional: row.professional_name
        ? { name: row.professional_name }
        : undefined,
      service: row.service_name
        ? {
            name: row.service_name,
            price: Number(row.service_price),
            duration: row.service_duration,
          }
        : undefined,
    };
  }
}
