import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { IUser } from '../../database/types';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(businessId: string) {
    const users = await this.db.knex<IUser>('users')
      .where({ business_id: businessId })
      .select('id', 'business_id', 'name', 'phone', 'role', 'is_verified', 'created_at', 'updated_at')
      .orderBy('created_at', 'desc');

    return users.map(this.toResponse);
  }

  async findProfessionals(businessId: string) {
    const users = await this.db.knex<IUser>('users')
      .where({ business_id: businessId, role: 'PROFESIONAL' })
      .select('id', 'business_id', 'name', 'role')
      .orderBy('name', 'asc');

    return users.map((u) => ({ id: u.id, name: u.name, role: u.role }));
  }

  async findById(id: string, businessId: string) {
    const user = await this.db.knex<IUser>('users')
      .where({ id, business_id: businessId })
      .select('id', 'business_id', 'name', 'phone', 'role', 'is_verified', 'created_at', 'updated_at')
      .first();

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.toResponse(user);
  }

  async update(id: string, businessId: string, data: Partial<Pick<IUser, 'name' | 'phone'>>) {
    const [updated] = await this.db.knex<IUser>('users')
      .where({ id, business_id: businessId })
      .update(data)
      .returning(['id', 'business_id', 'name', 'phone', 'role', 'is_verified', 'created_at', 'updated_at']);

    if (!updated) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.toResponse(updated);
  }

  async remove(id: string, businessId: string) {
    const deleted = await this.db.knex<IUser>('users')
      .where({ id, business_id: businessId })
      .del();

    if (!deleted) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return { message: 'Usuario eliminado' };
  }

  private toResponse(user: Partial<IUser>) {
    return {
      id: user.id,
      businessId: user.business_id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isVerified: user.is_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}
