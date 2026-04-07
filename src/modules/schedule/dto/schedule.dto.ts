import { IsInt, IsString, IsNotEmpty, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty({ example: 1, description: '0=Dom, 1=Lun, ..., 6=Sáb' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @IsNotEmpty()
  openTime: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @IsNotEmpty()
  closeTime: string;
}

export class UpdateScheduleDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  openTime?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  closeTime?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
