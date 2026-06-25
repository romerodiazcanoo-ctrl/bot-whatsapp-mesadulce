import { config as loadDotenv } from "dotenv";
import { LLMProvider, SessionStore } from "../types/index.js";

loadDotenv();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  server: {
    port: parseInt(optionalEnv("PORT", "3000"), 10),
    nodeEnv: optionalEnv("NODE_ENV", "development"),
  },

  whatsapp: {
    accessToken: requireEnv("WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: requireEnv("WHATSAPP_PHONE_NUMBER_ID"),
    verifyToken: requireEnv("WHATSAPP_VERIFY_TOKEN"),
    apiVersion: optionalEnv("WHATSAPP_API_VERSION", "v20.0"),
    get apiBaseUrl(): string {
      return `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
    },
  },

  llm: {
    provider: optionalEnv("LLM_PROVIDER", "anthropic") as LLMProvider,
    model: optionalEnv("LLM_MODEL", "claude-sonnet-4-6"),
    anthropicApiKey: process.env["ANTHROPIC_API_KEY"],
    openaiApiKey: process.env["OPENAI_API_KEY"],
  },

  outboundWebhook: {
    url: requireEnv("OUTBOUND_WEBHOOK_URL"),
    secret: optionalEnv("OUTBOUND_WEBHOOK_SECRET", ""),
  },

  session: {
    store: optionalEnv("SESSION_STORE", "memory") as SessionStore,
    redisUrl: optionalEnv("REDIS_URL", "redis://localhost:6379"),
    ttlSeconds: parseInt(optionalEnv("SESSION_TTL_SECONDS", "1800"), 10),
  },
} as const;

// Validación temprana de la API key del proveedor elegido
if (config.llm.provider === "anthropic" && !config.llm.anthropicApiKey) {
  throw new Error("ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic");
}
if (config.llm.provider === "openai" && !config.llm.openaiApiKey) {
  throw new Error("OPENAI_API_KEY is required when LLM_PROVIDER=openai");
}
