import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Resina compuesta' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Resina compuesta A2 jeringa 4g' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 45.5 })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  minStock: number;

  @ApiProperty({ example: 'unidad' })
  @IsString()
  @IsNotEmpty()
  unit: string;
}

export class UpdateProductDto {
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
  @Min(0)
  stock?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minStock?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  unit?: string;
}

export class AdjustStockDto {
  @ApiProperty({ example: -5, description: 'Positive to add, negative to deduct' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 'Restock from supplier' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
