import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class CancelSubscriptionDto {
  @ApiProperty({
    required: false,
    default: true,
    description:
      'true (default, recommended): cancel at the end of the current billing period. ' +
      'false: cancel immediately, no further invoices.',
  })
  @IsOptional()
  @IsBoolean()
  atPeriodEnd?: boolean;
}
