import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { RegisterDto, LoginDto, VerifyOtpDto } from './dto/auth.dto';
import { Role } from '../../database/types';
import type { IUser } from '../../database/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.db.knex<IUser>('users')
      .where({ business_id: dto.businessId, phone: dto.phone })
      .first();

    if (existing) {
      throw new ConflictException('El teléfono ya está registrado en este negocio');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // OTP deshabilitado temporalmente — registro directo sin verificación
    // const otpCode = String(randomInt(100000, 999999));
    // const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const [user] = await this.db.knex<IUser>('users')
      .insert({
        business_id: dto.businessId,
        name: dto.name,
        phone: dto.phone,
        password: hashedPassword,
        role: Role.CLIENTE,
        is_verified: true,
        // otp_code: otpCode,
        // otp_expires_at: otpExpiresAt,
      })
      .returning('*');

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async login(dto: LoginDto) {
    const query = this.db.knex<IUser>('users').where({ phone: dto.phone });
    if (dto.businessId) {
      query.andWhere({ business_id: dto.businessId });
    }
    const user = await query.first();

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async refreshTokens(refreshToken: string) {
    const users = await this.db.knex<IUser>('users')
      .whereNotNull('refresh_token');

    let matchedUser: IUser | undefined;
    for (const user of users) {
      if (user.refresh_token && await bcrypt.compare(refreshToken, user.refresh_token)) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new UnauthorizedException('Token de refresco inválido');
    }

    const tokens = await this.generateTokens(matchedUser);
    await this.updateRefreshToken(matchedUser.id, tokens.refreshToken);

    return tokens;
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.db.knex<IUser>('users')
      .where({ phone: dto.phone })
      .first();

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (user.otp_code !== dto.code) {
      throw new BadRequestException('Código incorrecto');
    }

    if (user.otp_expires_at && new Date(user.otp_expires_at) < new Date()) {
      throw new BadRequestException('Código expirado');
    }

    await this.db.knex<IUser>('users')
      .where({ id: user.id })
      .update({
        is_verified: true,
        otp_code: null as any,
        otp_expires_at: null as any,
      });

    return { message: 'Teléfono verificado exitosamente' };
  }

  async resendOtp(phone: string) {
    const user = await this.db.knex<IUser>('users')
      .where({ phone })
      .first();

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (user.is_verified) {
      throw new BadRequestException('El teléfono ya está verificado');
    }

    const otpCode = String(randomInt(100000, 999999));
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.db.knex<IUser>('users')
      .where({ id: user.id })
      .update({ otp_code: otpCode, otp_expires_at: otpExpiresAt });

    // TODO: Send OTP via SMS (Twilio, etc.)

    return {
      message: 'Código reenviado',
      otpCode: this.configService.get('NODE_ENV') !== 'production' ? otpCode : undefined,
    };
  }

  private async generateTokens(user: IUser) {
    const payload = {
      sub: user.id,
      businessId: user.business_id,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    await this.db.knex<IUser>('users')
      .where({ id: userId })
      .update({ refresh_token: hashedToken });
  }

  private sanitizeUser(user: IUser) {
    return {
      id: user.id,
      businessId: user.business_id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isVerified: user.is_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}
