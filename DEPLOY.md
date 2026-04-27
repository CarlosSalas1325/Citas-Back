# Guía de Deploy — Vercel (Backend + Frontend)

## Arquitectura

```
citas-front (Vercel) ──VITE_API_URL──► citas-back (Vercel) ──► Supabase PostgreSQL
                                                             └──► Cloudinary
```

---

## PASO 1 — Deploy del Backend (`citas-back`)

### 1.1 Repositorio
- Conecta el repo `Citas-Back` en Vercel
- Framework Preset: **Other**
- Root Directory: `/` (raíz)

### 1.2 Build & Output Settings
Vercel detecta el `vercel.json` automáticamente. No cambies nada.

```json
Build Command : pnpm run build
Install Command: pnpm install
Output        : (automático via vercel.json)
```

### 1.3 Variables de Entorno del Backend

Ve a: **Settings → Environment Variables**

Agrega estas variables en entorno **Production** y **Preview**:

| Variable                | Valor                                                                                           |
|-------------------------|-------------------------------------------------------------------------------------------------|
| `NODE_ENV`              | `production`                                                                                    |
| `DATABASE_URL`          | `postgresql://postgres.xqydrrxtctvbzpicbudr:%40Popotea2324@db.fgcawshhrqlkhkszqnwt.supabase.co:5432/postgres` |
| `JWT_SECRET`            | `dev-jwt-secret-sistemasCitas-2025`                                                             |
| `JWT_EXPIRES_IN`        | `15m`                                                                                           |
| `JWT_REFRESH_SECRET`    | `dev-refresh-secret-sistemasCitas-2025`                                                         |
| `JWT_REFRESH_EXPIRES_IN`| `7d`                                                                                            |
| `FRONTEND_URL`          | `https://TU-FRONTEND.vercel.app`  ← reemplaza con la URL real del frontend                     |
| `CLOUDINARY_CLOUD_NAME` | `dw0hqbkm4`                                                                                     |
| `CLOUDINARY_API_KEY`    | `413216492524346`                                                                               |
| `CLOUDINARY_API_SECRET` | `AF35cRnfBVTV8YQFC_EXLnclRJY`                                                                  |
| `BACKEND_PORT`          | `3000`                                                                                          |

### 1.4 Eliminar variables sobrantes
Estas apuntan a Docker local y no se usan en producción. **Elimínalas**:
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`

### 1.5 Verificar que funciona
Después del deploy abre en el navegador:

```
https://TU-BACKEND.vercel.app/api/docs
```
Debe aparecer la documentación Swagger. Si ves 401 en endpoints protegidos → el backend funciona correctamente.

---

## PASO 2 — Deploy del Frontend (`citas-front`)

### 2.1 Repositorio
- Conecta el repo `Citas-Front` en Vercel
- Framework Preset: **Vite**
- Root Directory: `/` (raíz)

### 2.2 Build Settings
```
Build Command : pnpm run build  (o npm run build)
Output Dir    : dist
Install Command: pnpm install
```

### 2.3 Variables de Entorno del Frontend

> ⚠️ Las variables `VITE_*` se inyectan en **build time**.
> Después de agregarlas debes hacer **Redeploy** manualmente.

| Variable       | Valor                                     |
|----------------|-------------------------------------------|
| `VITE_API_URL` | `https://TU-BACKEND.vercel.app`  ← URL real del backend |

### 2.4 Verificar que funciona
1. Abre `https://TU-FRONTEND.vercel.app` → debe cargar el login
2. Recarga la página en `/dashboard` → NO debe dar 404
3. Haz login → debe funcionar contra el backend en Vercel

---

## PASO 3 — Conectar ambos proyectos

Una vez tengas las URLs reales:

1. En **citas-back** → Settings → Environment Variables → edita `FRONTEND_URL` con la URL del frontend → **Save** → **Redeploy**
2. En **citas-front** → Settings → Environment Variables → edita `VITE_API_URL` con la URL del backend → **Save** → **Redeploy**

---

## Checklist final

- [ ] Backend desplegado en Vercel sin errores 500
- [ ] `https://TU-BACKEND.vercel.app/api/docs` devuelve Swagger
- [ ] Frontend desplegado con `VITE_API_URL` correcto
- [ ] Recargar rutas del frontend no da 404
- [ ] Login funciona en producción
- [ ] Upload de imágenes funciona (Cloudinary)
- [ ] Variables `DATABASE_HOST/PORT/USER/PASSWORD/NAME` eliminadas del backend en Vercel

---

## Solución de problemas comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `500 FUNCTION_INVOCATION_FAILED` | Módulo nativo no disponible | Revisar Runtime Logs en Vercel |
| `Cannot find module 'X'` | Dependencia faltante en `package.json` | `pnpm add X` → push |
| Login da 401 siempre | `JWT_SECRET` diferente entre deploys | Verificar que sea exactamente igual |
| Imágenes no suben | Vars de Cloudinary incorrectas | Verificar `CLOUDINARY_*` en Vercel |
| CORS error desde frontend | `FRONTEND_URL` incorrecta en backend | Actualizar con URL exacta de Vercel |
| Rutas dan 404 al recargar | Falta `vercel.json` en frontend | Ya incluido — hacer redeploy |
