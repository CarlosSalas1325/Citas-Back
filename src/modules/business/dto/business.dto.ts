import { IsString, IsNotEmpty, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BusinessType } from '../../../database/types';

export class CreateBusinessDto {
  @ApiProperty({ example: 'Clínica Dental Sonrisa' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'clinica-dental-sonrisa' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ enum: BusinessType, example: BusinessType.ODONTOLOGIA })
  @IsEnum(BusinessType)
  type: BusinessType;

  @ApiProperty({ example: '+584121234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Av. Principal #123' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  // Initial admin user
  @ApiProperty({ example: 'Dr. García' })
  @IsString()
  @IsNotEmpty()
  adminName: string;

  @ApiProperty({ example: '+584121234567' })
  @IsString()
  @IsNotEmpty()
  adminPhone: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  adminPassword: string;
}

/**
 * Self-serve business signup. Unlike CreateBusinessDto there is no slug — it is derived from
 * the name server-side, because a public signup form should not ask people to invent a URL
 * key and then fail them on a collision.
 *
 * The admin account is created either with a password or from a Google credential, so both
 * of those are optional here and validated as a pair in the service.
 */
export class SignupBusinessDto {
  @ApiProperty({ example: 'Clínica Dental Sonrisa' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: BusinessType, example: BusinessType.GENERAL })
  @IsEnum(BusinessType)
  type: BusinessType;

  @ApiProperty({ example: '+584121234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Av. Principal #123' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ required: false, description: 'Admin name. Taken from Google when omitted.' })
  @IsString()
  @IsOptional()
  adminName?: string;

  @ApiProperty({ required: false, description: 'Required for password signup.' })
  @IsString()
  @IsOptional()
  adminPhone?: string;

  @ApiProperty({ required: false, minLength: 6, description: 'Required for password signup.' })
  @IsString()
  @IsOptional()
  @MinLength(6)
  adminPassword?: string;

  @ApiProperty({
    required: false,
    description: 'Google ID token. Provide this instead of adminPhone/adminPassword.',
  })
  @IsString()
  @IsOptional()
  googleCredential?: string;
}
