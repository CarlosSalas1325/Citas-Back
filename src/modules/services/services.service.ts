import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import type { IService, IServiceProduct, IProduct } from '../../database/types';

@Injectable()
export class ServicesService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(businessId: string) {
    const services = await this.db.knex<IService>('services')
      .where({ business_id: businessId })
      .orderBy('created_at', 'desc');

    const serviceIds = services.map((s) => s.id);
    const serviceProducts = await this.db.knex<IServiceProduct & { product_name: string; product_stock: number; product_unit: string }>('service_products')
      .join('products', 'service_products.product_id', 'products.id')
      .whereIn('service_products.service_id', serviceIds)
      .select(
        'service_products.*',
        'products.name as product_name',
        'products.stock as product_stock',
        'products.unit as product_unit',
      );

    return services.map((s) => ({
      ...this.toResponse(s),
      products: serviceProducts
        .filter((sp) => sp.service_id === s.id)
        .map((sp) => ({
          id: sp.id,
          serviceId: sp.service_id,
          productId: sp.product_id,
          quantityUsed: sp.quantity_used,
          product: {
            name: sp.product_name,
            stock: sp.product_stock,
            unit: sp.product_unit,
          },
        })),
    }));
  }

  async findById(id: string, businessId: string) {
    const service = await this.db.knex<IService>('services')
      .where({ id, business_id: businessId })
      .first();

    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    const products = await this.db.knex('service_products')
      .join('products', 'service_products.product_id', 'products.id')
      .where({ 'service_products.service_id': id })
      .select('service_products.*', 'products.name as product_name');

    return {
      ...this.toResponse(service),
      products: products.map((sp) => ({
        id: sp.id,
        serviceId: sp.service_id,
        productId: sp.product_id,
        quantityUsed: sp.quantity_used,
        product: { name: sp.product_name },
      })),
    };
  }

  async create(businessId: string, dto: CreateServiceDto) {
    return this.db.knex.transaction(async (trx) => {
      const [service] = await trx<IService>('services')
        .insert({
          business_id: businessId,
          name: dto.name,
          description: dto.description,
          price: dto.price,
          duration: dto.duration,
        })
        .returning('*');

      if (dto.products?.length) {
        await trx('service_products').insert(
          dto.products.map((p) => ({
            service_id: service.id,
            product_id: p.productId,
            quantity_used: p.quantityUsed,
          })),
        );
      }

      return this.toResponse(service);
    });
  }

  async update(id: string, businessId: string, dto: UpdateServiceDto) {
    return this.db.knex.transaction(async (trx) => {
      const updateData: Record<string, unknown> = {};
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.price !== undefined) updateData.price = dto.price;
      if (dto.duration !== undefined) updateData.duration = dto.duration;

      const [service] = await trx<IService>('services')
        .where({ id, business_id: businessId })
        .update(updateData)
        .returning('*');

      if (!service) {
        throw new NotFoundException('Servicio no encontrado');
      }

      if (dto.products !== undefined) {
        await trx('service_products').where({ service_id: id }).del();
        if (dto.products.length) {
          await trx('service_products').insert(
            dto.products.map((p) => ({
              service_id: id,
              product_id: p.productId,
              quantity_used: p.quantityUsed,
            })),
          );
        }
      }

      return this.toResponse(service);
    });
  }

  async remove(id: string, businessId: string) {
    const deleted = await this.db.knex<IService>('services')
      .where({ id, business_id: businessId })
      .del();

    if (!deleted) {
      throw new NotFoundException('Servicio no encontrado');
    }
    return { message: 'Servicio eliminado' };
  }

  private toResponse(service: IService) {
    return {
      id: service.id,
      businessId: service.business_id,
      name: service.name,
      description: service.description,
      price: Number(service.price),
      duration: service.duration,
      isActive: service.is_active,
      createdAt: service.created_at,
    };
  }
}
