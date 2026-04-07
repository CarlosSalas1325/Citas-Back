import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ServiceProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty()
  @IsNumber()
  quantityUsed: number;
}

export class CreateServiceDto {
  @ApiProperty({ example: 'Limpieza dental' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Limpieza profunda con ultrasonido' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 50.0 })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 30, description: 'Duration in minutes' })
  @IsNumber()
  duration: number;

  @ApiProperty({ type: [ServiceProductDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ServiceProductDto)
  products?: ServiceProductDto[];
}

export class UpdateServiceDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  duration?: number;

  @ApiProperty({ type: [ServiceProductDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ServiceProductDto)
  products?: ServiceProductDto[];
}
