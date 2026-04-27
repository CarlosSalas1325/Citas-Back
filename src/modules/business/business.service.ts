import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../../database/database.service';
import { CreateBusinessDto } from './dto/business.dto';
import { Role } from '../../database/types';
import type { IBusiness, IUser } from '../../database/types';

@Injectable()
export class BusinessService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateBusinessDto) {
    return this.db.knex.transaction(async (trx) => {
      const [business] = await trx<IBusiness>('businesses')
        .insert({
          name: dto.name,
          slug: dto.slug,
          type: dto.type,
          phone: dto.phone,
          address: dto.address,
          logo_url: dto.logoUrl,
        })
        .returning('*');

      const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);

      const [admin] = await trx<IUser>('users')
        .insert({
          business_id: business.id,
          name: dto.adminName,
          phone: dto.adminPhone,
          password: hashedPassword,
          role: Role.ADMIN,
          is_verified: true,
        })
        .returning(['id', 'name', 'phone', 'role', 'is_verified', 'created_at']);

      return { business, admin };
    });
  }

  async findBySlug(slug: string) {
    const business = await this.db.knex<IBusiness>('businesses')
      .where({ slug })
      .select('id', 'name', 'type', 'slug')
      .first();

    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }
    return business;
  }

  async findMyBusiness(businessId: string) {
    const business = await this.db.knex<IBusiness>('businesses')
      .where({ id: businessId })
      .select('id', 'name', 'type', 'slug', 'phone', 'address', 'logo_url')
      .first();

    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }
    return business;
  }

  async findById(id: string) {
    const business = await this.db.knex<IBusiness>('businesses')
      .where({ id })
      .first();

    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }
    return business;
  }

  async findAll() {
    return this.db.knex<IBusiness>('businesses').orderBy('created_at', 'desc');
  }
}
