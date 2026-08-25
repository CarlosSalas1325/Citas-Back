import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class RefundInvoiceDto {
  @ApiProperty({
    description: 'business_id whose subscription payment is being refunded',
  })
  @IsUUID()
  businessId: string;

  @ApiProperty({
    description: 'Stripe invoice id (in_...) to refund the payment for',
  })
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @ApiProperty({
    required: false,
    description: 'Partial refund amount in cents. Omit for a full refund.',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  amount?: number;

  @ApiProperty({
    required: false,
    enum: ['duplicate', 'fraudulent', 'requested_by_customer'],
  })
  @IsOptional()
  @IsIn(['duplicate', 'fraudulent', 'requested_by_customer'])
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}
