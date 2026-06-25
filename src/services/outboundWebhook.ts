import axios, { AxiosError } from "axios";
import { DatosPedido } from "../types/index.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export interface WebhookPayload {
  evento: "nuevo_pedido";
  timestamp: string;
  fuente: "whatsapp";
  pedido: DatosPedido;
}

/**
 * Envía el pedido estructurado al webhook externo (Make, Zapier, n8n, etc.).
 * Incluye reintentos exponenciales (3 intentos).
 */
export async function dispararWebhookPedido(datos: DatosPedido): Promise<void> {
  const payload: WebhookPayload = {
    evento: "nuevo_pedido",
    timestamp: new Date().toISOString(),
    fuente: "whatsapp",
    pedido: datos,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.outboundWebhook.secret) {
    headers["X-Webhook-Secret"] = config.outboundWebhook.secret;
  }

  const MAX_ATTEMPTS = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await axios.post(config.outboundWebhook.url, payload, {
        headers,
        timeout: 15_000,
      });
      logger.info("Outbound webhook dispatched", {
        attempt,
        status: response.status,
        cliente: datos.nombre_cliente,
      });
      return;
    } catch (err) {
      lastError = err;
      const axiosErr = err as AxiosError;
      logger.warn("Outbound webhook attempt failed", {
        attempt,
        status: axiosErr.response?.status,
        message: axiosErr.message,
      });
      if (attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 1000); // 1s, 2s
      }
    }
  }

  logger.error("Outbound webhook failed after all retries", {
    cliente: datos.nombre_cliente,
    error: lastError,
  });
  // No lanzamos el error para no interrumpir la conversación con el cliente
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
