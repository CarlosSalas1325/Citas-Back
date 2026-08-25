import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { SubscriptionGuard } from './common/guards/subscription.guard';
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
import { BillingModule } from './modules/billing/billing.module';

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
    BillingModule,
  ],
  providers: [
    // Global: blocks the product surface once a business's trial ends with no active
    // subscription. Auth/billing/webhook paths are allowlisted inside the guard so an
    // expired business can still log in and pay.
    { provide: APP_GUARD, useClass: SubscriptionGuard },
  ],
})
export class AppModule {}
