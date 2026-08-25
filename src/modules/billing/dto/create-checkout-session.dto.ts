import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

// Rule 11: only the minimum PII needed for Stripe to deliver invoices/receipts — email.
// No DOB, no government ID, no "extra demographic" fields.
export class CreateCheckoutSessionDto {
  @ApiProperty({
    example: 'billing@mibarberia.com',
    description: 'Billing email for invoices/receipts',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    required: false,
    description:
      'Stripe Price ID for the plan. Defaults to STRIPE_DEFAULT_PRICE_ID if omitted. ' +
      'Never trust this blindly — the server validates it against STRIPE_ALLOWED_PRICE_IDS.',
  })
  @IsOptional()
  @IsString()
  priceId?: string;
}
