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
import {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  GoogleLoginDto,
  CompleteProfileDto,
} from './dto/auth.dto';
import { Role } from '../../database/types';
import type { IUser, IBusiness } from '../../database/types';
import { GoogleAuthService } from './google-auth.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly googleAuthService: GoogleAuthService,
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

    // Google-only accounts have no password. Without this guard bcrypt.compare would be
    // called with null and throw a 500 instead of telling the user how to actually get in.
    if (!user.password) {
      throw new UnauthorizedException(
        'Esta cuenta se creó con Google. Inicia sesión con Google.',
      );
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

  // Google Sign-In.
  //
  // Two entry points share this method:
  //   * the business page (/n/:slug) already knows which business the person is joining,
  //     so it passes businessId and we find-or-create the user there;
  //   * the generic /login has no business context, so we resolve it from the accounts the
  //     Google identity already has. When that is ambiguous (no account yet, or accounts in
  //     several businesses) we answer with the choices instead of tokens, and the client
  //     re-sends the same credential together with the chosen businessId.
  async loginWithGoogle(dto: GoogleLoginDto) {
    const profile = await this.googleAuthService.verify(dto.credential);

    if (dto.businessId) {
      const business = await this.db
        .knex<IBusiness>('businesses')
        .where({ id: dto.businessId })
        .first();
      if (!business) {
        throw new BadRequestException('Negocio no encontrado');
      }

      const user = await this.findOrCreateGoogleUser(profile, dto.businessId);
      return this.issueSession(user);
    }

    const matches = await this.db
      .knex<IUser>('users')
      .where({ google_id: profile.googleId })
      .orWhere({ email: profile.email });

    if (matches.length === 1) {
      // Existing password account matched by email — attach the Google identity so the next
      // sign-in resolves by google_id directly.
      const user = await this.linkGoogleIdentity(matches[0], profile);
      return this.issueSession(user);
    }

    // 0 matches -> the person has no account yet and must pick which business to join.
    // >1 matches -> the same Google identity belongs to several businesses; they choose one.
    const businesses =
      matches.length === 0
        ? await this.db
            .knex<IBusiness>('businesses')
            .select('id', 'name', 'type', 'slug')
            .orderBy('name')
        : await this.db
            .knex<IBusiness>('businesses')
            .select('id', 'name', 'type', 'slug')
            .whereIn(
              'id',
              matches.map((u) => u.business_id),
            )
            .orderBy('name');

    return {
      needsBusiness: true,
      isNewUser: matches.length === 0,
      email: profile.email,
      name: profile.name,
      businesses,
    };
  }

  // Phone is the business's contact channel for appointments, and Google never gives us one,
  // so it is collected on the first login instead of being silently left empty forever.
  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const user = await this.db.knex<IUser>('users').where({ id: userId }).first();
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    const taken = await this.db
      .knex<IUser>('users')
      .where({ business_id: user.business_id, phone: dto.phone })
      .whereNot({ id: userId })
      .first();
    if (taken) {
      throw new ConflictException(
        'El teléfono ya está registrado en este negocio',
      );
    }

    const [updated] = await this.db
      .knex<IUser>('users')
      .where({ id: userId })
      .update({ phone: dto.phone, updated_at: new Date() })
      .returning('*');

    return { user: this.sanitizeUser(updated) };
  }

  private async findOrCreateGoogleUser(
    profile: { googleId: string; email: string; name: string; avatarUrl: string | null },
    businessId: string,
  ): Promise<IUser> {
    const byGoogleId = await this.db
      .knex<IUser>('users')
      .where({ business_id: businessId, google_id: profile.googleId })
      .first();
    if (byGoogleId) return byGoogleId;

    const byEmail = await this.db
      .knex<IUser>('users')
      .where({ business_id: businessId, email: profile.email })
      .first();
    if (byEmail) return this.linkGoogleIdentity(byEmail, profile);

    // Google already verified the email, so the account starts verified — there is nothing
    // left for our own OTP to prove.
    const [created] = await this.db
      .knex<IUser>('users')
      .insert({
        business_id: businessId,
        name: profile.name,
        email: profile.email,
        google_id: profile.googleId,
        avatar_url: profile.avatarUrl,
        phone: null,
        password: null,
        role: Role.CLIENTE,
        is_verified: true,
      })
      .returning('*');

    return created;
  }

  private async linkGoogleIdentity(
    user: IUser,
    profile: { googleId: string; email: string; avatarUrl: string | null },
  ): Promise<IUser> {
    if (user.google_id === profile.googleId && user.avatar_url) return user;

    const [updated] = await this.db
      .knex<IUser>('users')
      .where({ id: user.id })
      .update({
        google_id: profile.googleId,
        email: user.email ?? profile.email,
        avatar_url: user.avatar_url ?? profile.avatarUrl,
        updated_at: new Date(),
      })
      .returning('*');

    return updated;
  }

  private async issueSession(user: IUser) {
    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  /**
   * Public entry point for flows that create a user outside this service (business signup)
   * and need the exact same session shape a normal login produces.
   */
  async issueSessionFor(user: IUser) {
    return this.issueSession(user);
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
      email: user.email ?? null,
      avatarUrl: user.avatar_url ?? null,
      role: user.role,
      isVerified: user.is_verified,
      // Lets the client route a fresh Google user straight to the phone form instead of
      // having to infer "profile incomplete" from a null phone on its own.
      needsProfile: !user.phone,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}
