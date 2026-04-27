import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessModule } from './modules/business/business.module';
import { UsersModule } from './modules/users/users.module';
import { ServicesModule } from './modules/services/services.module';
import { ProductsModule } from './modules/products/products.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    BusinessModule,
    UsersModule,
    ServicesModule,
    ProductsModule,
    AppointmentsModule,
    PortfolioModule,
    ScheduleModule,
    UploadModule,
  ],
})
export class AppModule {}
