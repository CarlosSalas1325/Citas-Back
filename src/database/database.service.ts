import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import knex, { Knex } from 'knex';
import { types } from 'pg';

// Prevent pg from wrapping TIMESTAMP WITHOUT TIME ZONE into a Date object.
// Without this, pg treats stored local times as UTC, causing a timezone shift
// when the returned ISO string is displayed in the browser.
types.setTypeParser(1114, (val: string) => val);

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly knexInstance: Knex;

  constructor(private readonly configService: ConfigService) {
    const isProd = configService.get('NODE_ENV') === 'production';
    const dbUrl = configService.get<string>('DATABASE_URL');

    this.knexInstance = knex({
      client: 'pg',
      connection: isProd && dbUrl
        ? { connectionString: dbUrl, ssl: { rejectUnauthorized: false } }
        : {
            host: this.configService.get('DATABASE_HOST', 'localhost'),
            port: this.configService.get<number>('DATABASE_PORT', 5432),
            user: this.configService.get('DATABASE_USER', 'postgres'),
            password: this.configService.get('DATABASE_PASSWORD', 'postgres'),
            database: this.configService.get('DATABASE_NAME', 'sistema_citas'),
          },
      pool: isProd ? { min: 0, max: 2 } : { min: 2, max: 10 },
    });
  }

  get knex(): Knex {
    return this.knexInstance;
  }

  async onModuleDestroy(): Promise<void> {
    await this.knexInstance.destroy();
  }
}
