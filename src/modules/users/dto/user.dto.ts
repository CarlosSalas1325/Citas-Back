import { IsString, IsOptional, IsNotEmpty, MinLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: ['ADMIN', 'PROFESIONAL', 'RECEPCIONISTA', 'PACIENTE'] })
  @IsEnum(['ADMIN', 'PROFESIONAL', 'RECEPCIONISTA', 'PACIENTE'])
  role: string;
}
