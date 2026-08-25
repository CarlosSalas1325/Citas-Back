import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}

// Verifies the ID token the browser gets back from Google Identity Services.
//
// We use the ID-token flow rather than a server-side redirect flow: the SPA and the API are
// separate origins, and this way the API never has to manage OAuth redirects or sessions —
// it only has to prove the token was really issued by Google for *our* client id.
@Injectable()
export class GoogleAuthService {
  private readonly client: OAuth2Client;
  private readonly clientId: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.client = new OAuth2Client(this.clientId);
  }

  get isConfigured(): boolean {
    return Boolean(this.clientId);
  }

  async verify(credential: string): Promise<GoogleProfile> {
    if (!this.clientId) {
      // Misconfiguration, not a client error — surfaced as 500 so it is not mistaken for
      // "the user's Google account was rejected".
      throw new InternalServerErrorException(
        'Google Sign-In no está configurado en el servidor (falta GOOGLE_CLIENT_ID).',
      );
    }

    let payload;
    try {
      // verifyIdToken checks the signature against Google's public keys, plus the audience
      // (our client id), the issuer and the expiry. A token minted for another site fails here.
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      // Never log the raw token — it is a credential.
      throw new UnauthorizedException('Token de Google inválido');
    }

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Token de Google incompleto');
    }

    // An unverified Google email could be an address the person does not actually control,
    // which would let them collide with someone else's account by email.
    if (!payload.email_verified) {
      throw new UnauthorizedException(
        'Tu correo de Google no está verificado. Verifícalo antes de continuar.',
      );
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email.split('@')[0],
      avatarUrl: payload.picture ?? null,
      emailVerified: true,
    };
  }
}
