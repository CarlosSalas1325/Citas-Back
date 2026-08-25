import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '+584121234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'uuid-of-business' })
  @IsString()
  @IsNotEmpty()
  businessId: string;
}

export class LoginDto {
  @ApiProperty({ example: '+584121234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'uuid-of-business', required: false })
  @IsString()
  @IsOptional()
  businessId?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+584121234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class ResendOtpDto {
  @ApiProperty({ example: '+584121234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class GoogleLoginDto {
  @ApiProperty({
    description: 'ID token issued by Google Identity Services for our client id',
  })
  @IsString()
  @IsNotEmpty()
  credential: string;

  @ApiProperty({
    example: 'uuid-of-business',
    required: false,
    description:
      'Business the user is signing into. Omitted from the generic login: the server then ' +
      'resolves it from the existing accounts, or answers with the list to choose from.',
  })
  @IsString()
  @IsOptional()
  businessId?: string;
}

export class CompleteProfileDto {
  @ApiProperty({ example: '+584121234567' })
  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  phone: string;
}
