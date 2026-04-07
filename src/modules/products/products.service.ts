import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateProductDto, UpdateProductDto, AdjustStockDto } from './dto/product.dto';
import type { IProduct } from '../../database/types';

@Injectable()
export class ProductsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(businessId: string) {
    const products = await this.db.knex<IProduct>('products')
      .where({ business_id: businessId })
      .orderBy('name', 'asc');

    return products.map((p) => this.toResponse(p));
  }

  async findById(id: string, businessId: string) {
    const product = await this.db.knex<IProduct>('products')
      .where({ id, business_id: businessId })
      .first();

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return this.toResponse(product);
  }

  async findLowStock(businessId: string) {
    const products = await this.db.knex<IProduct>('products')
      .where({ business_id: businessId })
      .whereRaw('stock <= min_stock')
      .orderBy('stock', 'asc');

    return products.map((p) => this.toResponse(p));
  }

  async create(businessId: string, dto: CreateProductDto) {
    const [product] = await this.db.knex<IProduct>('products')
      .insert({
        business_id: businessId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        min_stock: dto.minStock,
        unit: dto.unit,
      })
      .returning('*');

    return this.toResponse(product);
  }

  async update(id: string, businessId: string, dto: UpdateProductDto) {
    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.price !== undefined) updateData.price = dto.price;
    if (dto.stock !== undefined) updateData.stock = dto.stock;
    if (dto.minStock !== undefined) updateData.min_stock = dto.minStock;
    if (dto.unit !== undefined) updateData.unit = dto.unit;

    const [product] = await this.db.knex<IProduct>('products')
      .where({ id, business_id: businessId })
      .update(updateData)
      .returning('*');

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return this.toResponse(product);
  }

  async adjustStock(id: string, businessId: string, dto: AdjustStockDto) {
    return this.db.knex.transaction(async (trx) => {
      const product = await trx<IProduct>('products')
        .where({ id, business_id: businessId })
        .first();

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      const newStock = product.stock + dto.quantity;
      if (newStock < 0) {
        throw new BadRequestException(
          `Stock insuficiente. Stock actual: ${product.stock}, ajuste: ${dto.quantity}`,
        );
      }

      const [updated] = await trx<IProduct>('products')
        .where({ id })
        .update({ stock: newStock })
        .returning('*');

      return this.toResponse(updated);
    });
  }

  async remove(id: string, businessId: string) {
    const deleted = await this.db.knex<IProduct>('products')
      .where({ id, business_id: businessId })
      .del();

    if (!deleted) {
      throw new NotFoundException('Producto no encontrado');
    }
    return { message: 'Producto eliminado' };
  }

  private toResponse(product: IProduct) {
    return {
      id: product.id,
      businessId: product.business_id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      stock: product.stock,
      minStock: product.min_stock,
      unit: product.unit,
      isActive: product.is_active,
      createdAt: product.created_at,
    };
  }
}
