# Mesa Dulce — Control de Stock

Aplicación web para controlar el stock y la rotación de producto de Mesa Dulce Repostería
(cookies y brownies): stock crudo, horneado/congelado y de brownies, comparado en todo momento
contra el plan de producción.

## Stack

- Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind CSS
- Prisma 7 con SQLite (adapter `better-sqlite3`, modo WAL) — fácil de migrar a Postgres/MySQL
  cambiando el `provider` en `prisma/schema.prisma`
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
| `DATABASE_URL` | Por defecto `file:./dev.db` (SQLite local) |
| `AUTH_SECRET` | Generar con `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Credenciales OAuth de Google |
| `AUTH_TRUST_HOST` | `true` si se despliega detrás de un proxy/dominio propio |

### Credenciales de Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) → crear proyecto → **APIs & Services
   → Credentials → Create OAuth client ID** (tipo "Web application").
2. URI de redirección autorizada: `https://tu-dominio.com/api/auth/callback/google` (y
   `http://localhost:3000/api/auth/callback/google` para desarrollo).
3. Copiar Client ID / Client Secret a `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

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

## Notas de diseño

- El acceso se controla en tres capas: `proxy.ts` (chequeo optimista de sesión), un guard por
  página/Server Action (`src/lib/auth-guard.ts`) y el callback `signIn` de Auth.js
  (`src/auth.ts`) que valida el dispositivo autorizado antes de crear la sesión.
- El vínculo dispositivo↔cuenta se guarda en `User.deviceId`; un login desde otro dispositivo
  queda en `pendingDeviceId` hasta que el admin lo reautoriza desde **Usuarios**.
- Todo el stock se modela como filas `Stock(varietyId, etapa, cantidad)`, con un historial de
  auditoría en `StockMovimiento` para cada ajuste, producción u horneado.
