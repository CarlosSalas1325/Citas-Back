# Production Checklist — Stripe (facturación de plataforma)

Antes de activar cobros reales, completa cada punto. PagoKit dejó todo listo para sandbox;
el paso a producción es intencionalmente manual.

## 1. Reemplaza llaves de prueba por llaves reales

- [ ] En el Dashboard de Stripe, activa el modo Live y genera llaves live.
- [ ] En Railway (no en `.env.example`, que solo debe tener llaves `sk_test_`/`pk_test_`),
      reemplaza:
      - `STRIPE_SECRET_KEY` con el valor `sk_live_…`
      - `STRIPE_PUBLISHABLE_KEY` con `pk_live_…` (si algún frontend lo llega a necesitar)
      - `STRIPE_WEBHOOK_SECRET` con el `whsec_…` del endpoint live (se regenera por cada
        endpoint nuevo que crees en el Dashboard — no reuses el de test)
- [ ] Crea el producto y precio de la suscripción en modo Live (Dashboard → Product catalog)
      y actualiza `STRIPE_DEFAULT_PRICE_ID` / `STRIPE_ALLOWED_PRICE_IDS` con el `price_...` live.

## 2. Configura el endpoint de webhook en el Dashboard (modo Live)

- [ ] Crea un nuevo webhook endpoint apuntando a:
      `https://<tu-dominio-o-servicio>.up.railway.app/api/webhook/stripe`
- [ ] Suscríbelo a los mismos eventos que este backend maneja (ver `PAGOKIT_INTEGRATION.md`):
      `customer.subscription.created`, `customer.subscription.updated`,
      `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`,
      `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`,
      `charge.dispute.created`.
- [ ] Copia el nuevo `whsec_...` a las variables de Railway (paso 3).

## 3. Variables de entorno en Railway

```bash
railway variables set STRIPE_SECRET_KEY=sk_live_... --service backend
railway variables set STRIPE_WEBHOOK_SECRET=whsec_... --service backend
railway variables set STRIPE_DEFAULT_PRICE_ID=price_... --service backend
railway variables set STRIPE_ALLOWED_PRICE_IDS=price_... --service backend
railway variables set STRIPE_CHECKOUT_SUCCESS_URL=https://tu-frontend.com/billing/success --service backend
railway variables set STRIPE_CHECKOUT_CANCEL_URL=https://tu-frontend.com/billing/cancel --service backend
railway variables set STRIPE_PORTAL_RETURN_URL=https://tu-frontend.com/billing --service backend
```

- [ ] Nunca ejecutes `railway run env` y pegues el resultado en Slack/chat — riesgo de fuga
      de secretos.
- [ ] Usa el ambiente "Production" de Railway separado del de "Staging"/desarrollo para no
      mezclar llaves test y live.

## 4. Base de datos

- [ ] Corre la migración contra la base de producción:
      `railway run npm run migrate` (o conéctate directo si `DATABASE_URL` ya apunta a prod).
- [ ] Verifica que las 4 tablas nuevas existan: `pagokit_stripe_customers`,
      `pagokit_subscriptions`, `pagokit_idempotency_keys`, `pagokit_webhook_events_processed`.

## 5. Configura el Customer Portal en el Dashboard

- [ ] Ve a Dashboard → Settings → Billing → Customer portal (en modo Live, es una
      configuración separada de la de modo test).
- [ ] Define la política de cancelación (recomendado: fin de periodo, no inmediata),
      qué acciones puede hacer el negocio (actualizar método de pago, ver historial, etc.).

## 6. Facturación fiscal (México / LATAM)

Stripe **no es Merchant of Record** en este flujo (suscripción B2B directa). Si necesitas
emitir factura fiscal formal a los negocios (no solo el recibo automático de Stripe):

- [ ] Configura tu propio flujo de facturación — **CFDI 4.0** para negocios en México.
- [ ] Para negocios en otros países de LATAM (CO, AR, CL, PE), revisa la obligación de
      facturación electrónica local si aplica a tu modelo de negocio.
- [ ] Si prefieres automatizar impuestos internacionales, evalúa activar **Stripe Tax**
      (Dashboard → Tax) — soportado por el proveedor pero no configurado por PagoKit.

## 7. Prueba de sanidad final

- [ ] Desde un negocio real de prueba (o una cuenta secundaria), haz una suscripción real
      de bajo monto en modo Live desde un dispositivo distinto al de desarrollo.
- [ ] Confirma en los logs que el webhook llegó y que `pagokit_subscriptions` se actualizó.
- [ ] Cancela la suscripción vía `POST /billing/cancel` o el Billing Portal. Confirma que
      `customer.subscription.updated`/`deleted` llegó y actualizó el estado en la base.
- [ ] Emite un reembolso vía `POST /billing/refund` (con un usuario `SUPER_ADMIN`). Confirma
      que `charge.refunded` llegó.

## 8. Monitoreo

- [ ] Configura una alerta en el Dashboard de Stripe para fallos de cobro
      (Settings → Notifications → Failed payments).
- [ ] Vigila de cerca las primeras 24-48 horas en producción — revisa los logs de
      `[stripe.webhook]` en Railway para detectar `handler error` o eventos `unhandled`.
- [ ] Considera un job de limpieza periódico (cron en Railway) que borre filas de
      `pagokit_webhook_events_processed` donde `expires_at < now()`, para no acumular
      indefinidamente.

## Anti-patrones a evitar

- ❌ No reutilices el `whsec_...` de test en producción — Stripe genera uno distinto por
     cada endpoint.
- ❌ No pongas `sk_live_...`/`whsec_...` en `.env.example` ni en ningún archivo que se
     commitee al repositorio.
- ❌ No apagues el guard `RolesGuard` de `POST /billing/refund` — es una acción a nivel
     plataforma, restringida a `SUPER_ADMIN`.
- ❌ No asumas que `checkout.session.completed`/`payment_status: 'paid'` es suficiente para
     dar acceso — la fuente de verdad es siempre el webhook de suscripción
     (`customer.subscription.updated`).
