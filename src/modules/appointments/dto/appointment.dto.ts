import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  IsDateString,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AppointmentStatus } from '../../../database/types';

class ExtraProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;
}

export class CreateAppointmentDto {
  @ApiProperty({ example: 'uuid-of-patient' })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ example: 'uuid-of-professional' })
  @IsString()
  @IsNotEmpty()
  professionalId: string;

  @ApiProperty({ example: 'uuid-of-service' })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ example: '2025-07-15T10:00:00Z' })
  @IsDateString()
  dateTime: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CompleteAppointmentDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [ExtraProductDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExtraProductDto)
  extraProducts?: ExtraProductDto[];
}

export class UpdateAppointmentDto {
  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dateTime?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ enum: AppointmentStatus, required: false })
  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;
}
