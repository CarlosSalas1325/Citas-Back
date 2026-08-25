// PagoKit — Stripe error mapper.
// Maps Stripe SDK error codes to PagoKit's cross-provider taxonomy so the API always
// returns a stable { code, message } shape instead of leaking Stripe's internal error text.
//
// Rule 6: only { pagokit_code, raw_code } should ever be logged — never err.message or the
// full error object, which can include Stripe-internal ids and cardholder-adjacent detail.
// Rule 11: user-facing messages are minimal — no order ids, no emails echoed back.
import Stripe from 'stripe';

export type PagokitErrorCode =
  | 'declined'
  | 'insufficient_funds'
  | 'card_expired'
  | 'incorrect_cvc'
  | 'requires_action'
  | 'fraud_suspected'
  | 'processing_error'
  | 'currency_unsupported'
  | 'amount_too_small'
  | 'amount_too_large'
  | 'rate_limited'
  | 'network_error'
  | 'internal_error';

export interface PagokitError {
  code: PagokitErrorCode;
  user_message: { es: string; en: string };
  raw_code?: string; // for logging only, NOT user-facing
}

const STRIPE_CODE_MAP: Record<string, PagokitErrorCode> = {
  card_declined: 'declined',
  insufficient_funds: 'insufficient_funds',
  expired_card: 'card_expired',
  incorrect_cvc: 'incorrect_cvc',
  authentication_required: 'requires_action',
  fraudulent: 'fraud_suspected',
  processing_error: 'processing_error',
  currency_not_supported: 'currency_unsupported',
  amount_too_small: 'amount_too_small',
  amount_too_large: 'amount_too_large',
};

const USER_MESSAGES: Record<PagokitErrorCode, { es: string; en: string }> = {
  declined: {
    es: 'Tu banco rechazó la tarjeta. Intenta con otra tarjeta o contacta a tu banco.',
    en: 'Your bank declined the card. Try another card or contact your bank.',
  },
  insufficient_funds: {
    es: 'La tarjeta no tiene fondos suficientes.',
    en: 'Insufficient funds on the card.',
  },
  card_expired: {
    es: 'La tarjeta está vencida.',
    en: 'The card has expired.',
  },
  incorrect_cvc: {
    es: 'El código de seguridad (CVC) es incorrecto.',
    en: 'The security code (CVC) is incorrect.',
  },
  requires_action: {
    es: 'Tu banco requiere autenticación adicional. Sigue las instrucciones en pantalla.',
    en: 'Your bank requires additional authentication. Follow the on-screen instructions.',
  },
  fraud_suspected: {
    es: 'Tu banco marcó este intento como sospechoso. Contáctalo para autorizar la compra.',
    en: 'Your bank flagged this attempt. Contact them to authorize the purchase.',
  },
  processing_error: {
    es: 'Hubo un problema procesando el pago. Intenta de nuevo en unos minutos.',
    en: 'A processing error occurred. Try again in a few minutes.',
  },
  currency_unsupported: {
    es: 'Esta moneda no está habilitada en la cuenta de pago.',
    en: 'This currency is not enabled on the payment account.',
  },
  amount_too_small: {
    es: 'El monto es menor al mínimo permitido.',
    en: 'The amount is below the minimum allowed.',
  },
  amount_too_large: {
    es: 'El monto excede el máximo permitido.',
    en: 'The amount exceeds the maximum allowed.',
  },
  rate_limited: {
    es: 'Demasiadas solicitudes. Espera unos segundos e intenta de nuevo.',
    en: 'Too many requests. Wait a few seconds and try again.',
  },
  network_error: {
    es: 'No pudimos conectar con el proveedor de pagos. Verifica tu conexión.',
    en: 'Could not reach the payment provider. Check your connection.',
  },
  internal_error: {
    es: 'Algo falló de nuestro lado. Inténtalo más tarde.',
    en: 'Something went wrong on our side. Try again later.',
  },
};

export function mapStripeError(err: unknown): PagokitError {
  if (err instanceof Stripe.errors.StripeCardError) {
    const code: PagokitErrorCode =
      STRIPE_CODE_MAP[err.code ?? ''] ?? 'declined';
    return { code, user_message: USER_MESSAGES[code], raw_code: err.code };
  }
  if (err instanceof Stripe.errors.StripeRateLimitError) {
    return { code: 'rate_limited', user_message: USER_MESSAGES.rate_limited };
  }
  if (err instanceof Stripe.errors.StripeConnectionError) {
    return { code: 'network_error', user_message: USER_MESSAGES.network_error };
  }
  if (err instanceof Stripe.errors.StripeInvalidRequestError) {
    const code: PagokitErrorCode =
      STRIPE_CODE_MAP[err.code ?? ''] ?? 'internal_error';
    return { code, user_message: USER_MESSAGES[code], raw_code: err.code };
  }
  return { code: 'internal_error', user_message: USER_MESSAGES.internal_error };
}
