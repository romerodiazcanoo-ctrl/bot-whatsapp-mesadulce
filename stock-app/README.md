# Mesa Dulce — Control de Stock

Aplicación web para controlar el stock y la rotación de producto de Mesa Dulce Repostería
(cookies y brownies): stock crudo, horneado/congelado y de brownies, comparado en todo momento
contra el plan de producción.

## Stack

- Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind CSS
- Prisma 7 con Postgres (adapter `pg`) — funciona con cualquier Postgres (Vercel Postgres/Neon,
  Supabase, RDS, uno local, etc.)
- Auth.js (NextAuth v5) con Google como único proveedor de login
- Recharts para los gráficos de producción

## Funcionalidad

- **Stock por etapa y variedad**: crudo (cookies clásicas y rellenas), horneado/congelado (solo
  rellenas) y porciones/planchas de brownies.
- **Rendimiento automático**: al cargar el peso de masa producida, calcula unidades = peso ÷ peso
  unitario de referencia (120 g rellena, 40 g clásica) y lo suma al stock crudo.
- **Plan de producción**: se carga por variedad y el sistema compara contra el stock crudo
  disponible (falta producir / disponible para hornear / disponible para decorar).
- **Historial y proyecciones**: gráfico de producción semanal y una proyección simple (promedio +
  tendencia) por variedad.
- **Accesos**: el administrador otorga el acceso manualmente por cuenta de Gmail. El primer login
  de cada persona queda vinculado a ese dispositivo; un intento desde otro dispositivo queda
  bloqueado hasta que el administrador lo reautorice.
- **Roles**: `ADMIN` (gestiona usuarios y variedades), `EDITOR` (carga stock/producción/plan),
  `LECTOR` (solo lectura).

## Setup

```bash
npm install
cp .env.example .env
```

Completá `.env`:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Connection string de Postgres |
| `AUTH_SECRET` | Generar con `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Credenciales OAuth de Google |
| `AUTH_TRUST_HOST` | `true` si se despliega detrás de un proxy/dominio propio |

Las credenciales de Google OAuth se explican en la sección **Desplegar en Vercel** más abajo
(el mismo proyecto de Google sirve para desarrollo local y producción).

### Base de datos

```bash
npx prisma migrate deploy   # crea las tablas
npx prisma db seed          # carga variedades + stock inicial en 0 + usuario admin
```

El seed crea al administrador inicial con el email definido en `prisma/seed.ts`
(`ADMIN_EMAIL`) — cambialo antes de sembrar si corresponde, o editalo después desde
**Usuarios** una vez logueado.

### Desarrollo

```bash
npm run dev
```

### Producción

```bash
npm run build
npm start
```

## Desplegar en Vercel

1. **Importar el repo**: en [vercel.com](https://vercel.com) → **Add New → Project** → elegir este
   repositorio de GitHub → como *Root Directory* seleccionar `stock-app` (no la raíz del repo,
   porque el bot de WhatsApp vive en un directorio separado).
2. **Base de datos**: en la pestaña **Storage** del proyecto → **Create Database → Postgres**
   (usa Neon por debajo). Al conectarla, Vercel agrega `DATABASE_URL` automáticamente a las
   variables de entorno del proyecto.
3. **Variables de entorno** (Project → Settings → Environment Variables), además de la que Vercel
   ya agregó:
   - `AUTH_SECRET`: generar con `openssl rand -base64 32`
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`: ver más abajo
   - `AUTH_TRUST_HOST` = `true`
4. **Deploy**: el comando de build ya incluye `prisma migrate deploy`, así que las tablas se crean
   solas en cada deploy. Después del primer deploy, corré el seed una vez apuntando a esa base
   (`DATABASE_URL` de Vercel en tu `.env` local) con `npx prisma db seed`, para tener las
   variedades y el usuario administrador inicial.
5. Con la URL real que te da Vercel, volvé a Google Cloud Console y agregá
   `https://tu-proyecto.vercel.app/api/auth/callback/google` como URI de redirección autorizada
   (podés tener varias URIs cargadas a la vez, dev y producción conviven sin problema).

### Credenciales de Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) con la cuenta de Gmail del negocio.
2. Crear un proyecto nuevo (o usar uno existente) → **APIs & Services → OAuth consent screen**:
   tipo "External", completar nombre de la app y tu email de contacto. No hace falta verificación
   de Google para uso interno con pocos usuarios.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → tipo
   "Web application".
4. En **Authorized redirect URIs** agregar:
   - `http://localhost:3000/api/auth/callback/google` (desarrollo)
   - `https://tu-proyecto.vercel.app/api/auth/callback/google` (producción, con la URL real)
5. Copiar el **Client ID** y **Client Secret** generados a `AUTH_GOOGLE_ID` y
   `AUTH_GOOGLE_SECRET`.

## Notas de diseño

- El acceso se controla en tres capas: `proxy.ts` (chequeo optimista de sesión), un guard por
  página/Server Action (`src/lib/auth-guard.ts`) y el callback `signIn` de Auth.js
  (`src/auth.ts`) que valida el dispositivo autorizado antes de crear la sesión.
- El vínculo dispositivo↔cuenta se guarda en `User.deviceId`; un login desde otro dispositivo
  queda en `pendingDeviceId` hasta que el admin lo reautoriza desde **Usuarios**.
- Todo el stock se modela como filas `Stock(varietyId, etapa, cantidad)`, con un historial de
  auditoría en `StockMovimiento` para cada ajuste, producción u horneado.
