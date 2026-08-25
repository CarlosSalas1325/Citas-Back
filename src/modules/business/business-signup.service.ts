import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import type { Knex } from 'knex';
import { DatabaseService } from '../../database/database.service';
import { AuthService } from '../auth/auth.service';
import { GoogleAuthService } from '../auth/google-auth.service';
import { SignupBusinessDto } from './dto/business.dto';
import { Role } from '../../database/types';
import type { IBusiness, IUser } from '../../database/types';

const DEFAULT_TRIAL_DAYS = 14;

/** "Clínica Dental Sonrisa" -> "clinica-dental-sonrisa" */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class BusinessSignupService {
  constructor(
    private readonly db: DatabaseService,
    private readonly authService: AuthService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Public self-serve signup: creates the business, its first ADMIN, and starts the free
   * trial — then returns a session so the new owner lands inside the app instead of being
   * bounced to a login form.
   */
  async signup(dto: SignupBusinessDto) {
    const usingGoogle = Boolean(dto.googleCredential);

    if (!usingGoogle && (!dto.adminPhone || !dto.adminPassword || !dto.adminName)) {
      throw new BadRequestException(
        'Faltan datos del administrador: nombre, teléfono y contraseña (o inicia con Google).',
      );
    }

    // Verify Google *before* opening the transaction: it is a network call to Google and
    // should not hold a database transaction open, nor create a business if it fails.
    const googleProfile = dto.googleCredential
      ? await this.googleAuthService.verify(dto.googleCredential)
      : null;

    const trialDays = Number(
      this.configService.get('TRIAL_PERIOD_DAYS', DEFAULT_TRIAL_DAYS),
    );
    const trialEndsAt = new Date(Date.now() + trialDays * 86_400_000);

    const user = await this.db.knex.transaction(async (trx) => {
      const slug = await this.uniqueSlug(trx, slugify(dto.name));

      const [business] = await trx<IBusiness>('businesses')
        .insert({
          name: dto.name,
          slug,
          type: dto.type,
          phone: dto.phone,
          address: dto.address,
          trial_ends_at: trialEndsAt,
        })
        .returning('*');

      const adminRow = googleProfile
        ? {
            business_id: business.id,
            name: dto.adminName || googleProfile.name,
            email: googleProfile.email,
            google_id: googleProfile.googleId,
            avatar_url: googleProfile.avatarUrl,
            // Google gives no phone; the owner completes it at /complete-profile.
            phone: null,
            password: null,
            role: Role.ADMIN,
            is_verified: true,
          }
        : {
            business_id: business.id,
            name: dto.adminName as string,
            phone: dto.adminPhone as string,
            password: await bcrypt.hash(dto.adminPassword as string, 10),
            role: Role.ADMIN,
            is_verified: true,
          };

      const [admin] = await trx<IUser>('users').insert(adminRow).returning('*');
      return admin;
    });

    // Reuses the normal session issuing path so signup and login produce identical tokens.
    return this.authService.issueSessionFor(user);
  }

  /**
   * Two businesses can legitimately share a name, but slug is unique — so append a counter
   * rather than rejecting a signup over something the user never chose.
   */
  private async uniqueSlug(trx: Knex.Transaction, base: string): Promise<string> {
    const root = base || 'negocio';

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
      const taken = await trx<IBusiness>('businesses')
        .where({ slug: candidate })
        .first();
      if (!taken) return candidate;
    }

    throw new ConflictException(
      'No se pudo generar una URL única para ese nombre. Prueba con otro.',
    );
  }
}
