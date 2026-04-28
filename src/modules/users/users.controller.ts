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
import { UsersService } from './users.service';
import { UpdateUserDto, CreateUserDto } from './dto/user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new user in the business (ADMIN only)' })
  create(
    @CurrentUser('businessId') businessId: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(businessId, dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all users of the business' })
  findAll(@CurrentUser('businessId') businessId: string) {
    return this.usersService.findAll(businessId);
  }

  @Get('professionals')
  @ApiOperation({ summary: 'List professionals (for booking)' })
  findProfessionals(@CurrentUser('businessId') businessId: string) {
    return this.usersService.findProfessionals(businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findById(@Param('id') id: string, @CurrentUser('businessId') businessId: string) {
    return this.usersService.findById(id, businessId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  update(
    @Param('id') id: string,
    @CurrentUser('businessId') businessId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, businessId, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete user (ADMIN only)' })
  remove(@Param('id') id: string, @CurrentUser('businessId') businessId: string) {
    return this.usersService.remove(id, businessId);
  }
}
