import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../database/types';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, AdjustStockDto } from './dto/product.dto';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all products' })
  findAll(@CurrentUser('businessId') businessId: string) {
    return this.productsService.findAll(businessId);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'List products with low stock' })
  findLowStock(@CurrentUser('businessId') businessId: string) {
    return this.productsService.findLowStock(businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findById(@Param('id') id: string, @CurrentUser('businessId') businessId: string) {
    return this.productsService.findById(id, businessId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create product (ADMIN only)' })
  create(@CurrentUser('businessId') businessId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(businessId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update product (ADMIN only)' })
  update(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, businessId, dto);
  }

  @Patch(':id/adjust')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Adjust product stock (ADMIN only)' })
  adjustStock(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.productsService.adjustStock(id, businessId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete product (ADMIN only)' })
  remove(@Param('id') id: string, @CurrentUser('businessId') businessId: string) {
    return this.productsService.remove(id, businessId);
  }
}
