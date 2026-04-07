import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import knex, { Knex } from 'knex';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly knexInstance: Knex;

  constructor(private readonly configService: ConfigService) {
    this.knexInstance = knex({
      client: 'pg',
      connection: {
        host: this.configService.get('DATABASE_HOST', 'localhost'),
        port: this.configService.get<number>('DATABASE_PORT', 5432),
        user: this.configService.get('DATABASE_USER', 'postgres'),
        password: this.configService.get('DATABASE_PASSWORD', 'postgres'),
        database: this.configService.get('DATABASE_NAME', 'sistema_citas'),
      },
      pool: { min: 2, max: 10 },
    });
  }

  get knex(): Knex {
    return this.knexInstance;
  }

  async onModuleDestroy(): Promise<void> {
    await this.knexInstance.destroy();
  }
}
