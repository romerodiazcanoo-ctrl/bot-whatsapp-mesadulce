# Mesa Dulce — WhatsApp AI Agent

Bot de WhatsApp con IA para automatizar la toma de pedidos de **Mesa Dulce Repostería**.

## Arquitectura

```
WhatsApp (cliente)
       │
       ▼
Meta Cloud API ──► POST /webhook ──► Express (Node.js/TS)
                                         │
                                    sessionStore (memory | Redis)
                                         │
                                    LLM Service (Anthropic / OpenAI)
                                     ├── Function Calling: procesar_pedido()
                                         │
                                    outboundWebhook ──► Make / Zapier / n8n
```

## Estructura de archivos

```
src/
├── index.ts                  # Entry point, servidor HTTP
├── app.ts                    # Express app factory
├── config/
│   ├── index.ts              # Variables de entorno tipadas
│   └── systemPrompt.ts       # Prompt del agente de IA
├── controllers/
│   ├── webhookController.ts     # Lógica de recepción y orquestación
│   └── mayoristasController.ts  # Postulaciones del formulario de mayoristas
├── routes/
│   ├── webhook.ts            # GET/POST /webhook
│   └── mayoristas.ts         # POST /api/mayoristas
├── services/
│   ├── llmService.ts         # Integración Anthropic/OpenAI con function calling
│   ├── sessionStore.ts       # Estado de conversación (memory/Redis)
│   ├── whatsappService.ts    # Envío de mensajes via WhatsApp Cloud API
│   └── outboundWebhook.ts    # POST al webhook externo (pedidos y postulaciones)
├── types/
│   └── index.ts              # Tipos TypeScript
└── utils/
    └── logger.ts             # Logger simple sin dependencias extra

public/
└── mayoristas.html            # Formulario web de postulación mayorista
```

## Setup rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Editá .env con tus credenciales reales
```

### 3. Obtener credenciales de WhatsApp Cloud API

1. Ir a [Meta for Developers](https://developers.facebook.com)
2. Crear una App → **Business** → **WhatsApp**
3. Agregar un número de prueba
4. Copiar:
   - `WHATSAPP_ACCESS_TOKEN` (token de acceso permanente)
   - `WHATSAPP_PHONE_NUMBER_ID` (ID del número)
5. Configurar el webhook en Meta:
   - URL: `https://tu-dominio.com/webhook`
   - Verify Token: el mismo valor de `WHATSAPP_VERIFY_TOKEN`
   - Suscribir a: `messages`

### 4. Elegir proveedor LLM

**Anthropic (recomendado):**
```env
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-6
ANTHROPIC_API_KEY=sk-ant-...
```

**OpenAI:**
```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...
```

### 5. Configurar webhook de salida
En Make/Zapier, crear un webhook "catch" y pegar la URL:
```env
OUTBOUND_WEBHOOK_URL=https://hook.make.com/xxxx
```

### 6. Correr en desarrollo
```bash
npm run dev
```

Para exponer localmente a internet (testing con Meta):
```bash
npx ngrok http 3000
# Usar la URL de ngrok como webhook en Meta
```

### 7. Build para producción
```bash
npm run build
npm start
```

---

## Payload del webhook de salida

Cuando el agente completa un pedido, dispara un POST a `OUTBOUND_WEBHOOK_URL` con este JSON:

```json
{
  "evento": "nuevo_pedido",
  "timestamp": "2024-10-15T14:30:00.000Z",
  "fuente": "whatsapp",
  "pedido": {
    "nombre_cliente": "Lucía García",
    "telefono": "5491112345678",
    "direccion_envio": "Calle Mitre 450 piso 2 dpto A, Buenos Aires",
    "productos": [
      {
        "nombre": "Combo Entre Dos",
        "cantidad": 1,
        "sabores": ["Cookie Oreo", "Cookie Doble Chocolate", "Brownie Clásico"]
      }
    ],
    "aclaraciones": ""
  }
}
```

---

## Formulario de postulación mayorista

Página estática servida en `/mayoristas.html` (y todo `public/` vía `express.static`).
Al enviarse, hace `POST /api/mayoristas`, que valida los datos y dispara un POST a
`OUTBOUND_WEBHOOK_URL` con este JSON:

```json
{
  "evento": "nueva_postulacion_mayorista",
  "timestamp": "2024-10-15T14:30:00.000Z",
  "fuente": "web",
  "postulacion": {
    "nombre_comercio": "Café Rincón",
    "ubicacion": "Palermo, CABA",
    "instagram_web": "@caferincon",
    "tipo_negocio": "Cafetería de especialidad",
    "almacenamiento": "Sí, freezer exclusivo",
    "volumen_semanal": "100 a 250 unidades",
    "whatsapp_contacto": "+5491112345678",
    "email": "contacto@caferincon.com"
  }
}
```

---

## Sesiones

| Store    | Cuándo usar                            |
|----------|----------------------------------------|
| `memory` | Deploy single-instance, staging        |
| `redis`  | Producción multi-instancia (Railway, Fly, etc.) |

Para Redis, setear:
```env
SESSION_STORE=redis
REDIS_URL=redis://usuario:password@host:6379
```

---

## Despliegue recomendado

| Plataforma | Comando                               |
|------------|---------------------------------------|
| Railway    | Conectar repo → Deploy automático     |
| Fly.io     | `fly launch && fly deploy`            |
| Render     | Web Service → Build: `npm run build` → Start: `npm start` |

> **Tip:** Usar `SESSION_STORE=redis` en producción con [Upstash](https://upstash.com) (tiene free tier).

---

## Variables de entorno — referencia completa

| Variable                  | Requerida | Descripción                                    |
|---------------------------|-----------|------------------------------------------------|
| `WHATSAPP_ACCESS_TOKEN`   | ✅        | Token de acceso de la App de Meta              |
| `WHATSAPP_PHONE_NUMBER_ID`| ✅        | ID del número de teléfono de WhatsApp          |
| `WHATSAPP_VERIFY_TOKEN`   | ✅        | Token para verificar el webhook con Meta       |
| `WHATSAPP_API_VERSION`    | ❌        | Versión API (default: `v20.0`)                 |
| `ANTHROPIC_API_KEY`       | Condicional | Si `LLM_PROVIDER=anthropic`                 |
| `OPENAI_API_KEY`          | Condicional | Si `LLM_PROVIDER=openai`                    |
| `LLM_PROVIDER`            | ❌        | `anthropic` o `openai` (default: `anthropic`)  |
| `LLM_MODEL`               | ❌        | ID del modelo (default: `claude-sonnet-4-6`)   |
| `OUTBOUND_WEBHOOK_URL`    | ✅        | URL del webhook externo para registrar pedidos |
| `OUTBOUND_WEBHOOK_SECRET` | ❌        | Header `X-Webhook-Secret` para autenticar      |
| `SESSION_STORE`           | ❌        | `memory` o `redis` (default: `memory`)         |
| `REDIS_URL`               | Condicional | Si `SESSION_STORE=redis`                    |
| `SESSION_TTL_SECONDS`     | ❌        | TTL de sesión en segundos (default: `1800`)    |
| `PORT`                    | ❌        | Puerto HTTP (default: `3000`)                  |
| `NODE_ENV`                | ❌        | `development` o `production`                   |
| `LOG_LEVEL`               | ❌        | `error`, `warn`, `info`, `debug`               |
