import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreatePortfolioDto, UpdatePortfolioDto } from './dto/portfolio.dto';
import type { IPortfolio } from '../../database/types';

@Injectable()
export class PortfolioService {
  constructor(private readonly db: DatabaseService) {}

  async findAllPublic(businessId: string) {
    const items = await this.db.knex<IPortfolio>('portfolio')
      .where({ 'portfolio.business_id': businessId, 'portfolio.is_active': true })
      .join('users', 'portfolio.user_id', 'users.id')
      .select('portfolio.*', 'users.name as author_name')
      .orderBy('portfolio.created_at', 'desc');

    return items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      imageUrl: item.image_url,
      authorName: (item as any).author_name,
      createdAt: item.created_at,
    }));
  }

  async findAll(businessId: string) {
    const items = await this.db.knex<IPortfolio>('portfolio')
      .where({ 'portfolio.business_id': businessId })
      .join('users', 'portfolio.user_id', 'users.id')
      .select('portfolio.*', 'users.name as author_name')
      .orderBy('portfolio.created_at', 'desc');

    return items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      imageUrl: item.image_url,
      isActive: item.is_active,
      authorName: (item as any).author_name,
      createdAt: item.created_at,
    }));
  }

  async create(businessId: string, userId: string, dto: CreatePortfolioDto) {
    const [item] = await this.db.knex<IPortfolio>('portfolio')
      .insert({
        business_id: businessId,
        user_id: userId,
        title: dto.title,
        description: dto.description,
        image_url: dto.imageUrl,
      })
      .returning('*');

    return { id: item.id, title: item.title, imageUrl: item.image_url };
  }

  async update(id: string, businessId: string, dto: UpdatePortfolioDto) {
    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.imageUrl !== undefined) updateData.image_url = dto.imageUrl;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    const [item] = await this.db.knex<IPortfolio>('portfolio')
      .where({ id, business_id: businessId })
      .update(updateData)
      .returning('*');

    if (!item) throw new NotFoundException('Entrada no encontrada');
    return { id: item.id, title: item.title };
  }

  async remove(id: string, businessId: string) {
    const deleted = await this.db.knex<IPortfolio>('portfolio')
      .where({ id, business_id: businessId })
      .del();

    if (!deleted) throw new NotFoundException('Entrada no encontrada');
    return { message: 'Eliminado' };
  }
}
