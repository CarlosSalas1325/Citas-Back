import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { BusinessSignupService } from './business-signup.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  // AuthModule provides AuthService/GoogleAuthService so signup can issue a session and
  // accept a Google credential for the first admin.
  imports: [AuthModule],
  controllers: [BusinessController],
  providers: [BusinessService, BusinessSignupService],
  exports: [BusinessService],
})
export class BusinessModule {}
