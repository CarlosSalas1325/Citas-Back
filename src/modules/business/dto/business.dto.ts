import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
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
