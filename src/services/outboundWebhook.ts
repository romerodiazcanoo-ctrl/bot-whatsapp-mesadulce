import axios, { AxiosError } from "axios";
import { DatosPedido, DatosPostulacionMayorista } from "../types/index.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export interface WebhookPayloadPedido {
  evento: "nuevo_pedido";
  timestamp: string;
  fuente: "whatsapp";
  pedido: DatosPedido;
}

export interface WebhookPayloadPostulacionMayorista {
  evento: "nueva_postulacion_mayorista";
  timestamp: string;
  fuente: "web";
  postulacion: DatosPostulacionMayorista;
}

/**
 * Envía el pedido estructurado al webhook externo (Make, Zapier, n8n, etc.).
 * Incluye reintentos exponenciales (3 intentos).
 */
export async function dispararWebhookPedido(datos: DatosPedido): Promise<void> {
  const payload: WebhookPayloadPedido = {
    evento: "nuevo_pedido",
    timestamp: new Date().toISOString(),
    fuente: "whatsapp",
    pedido: datos,
  };

  await dispararWebhook(payload, { cliente: datos.nombre_cliente });
}

/**
 * Envía una postulación de mayorista al webhook externo (Make, Zapier, n8n, etc.).
 * Incluye reintentos exponenciales (3 intentos).
 */
export async function dispararWebhookMayorista(
  datos: DatosPostulacionMayorista,
): Promise<void> {
  const payload: WebhookPayloadPostulacionMayorista = {
    evento: "nueva_postulacion_mayorista",
    timestamp: new Date().toISOString(),
    fuente: "web",
    postulacion: datos,
  };

  await dispararWebhook(payload, { comercio: datos.nombre_comercio });
}

async function dispararWebhook(
  payload: WebhookPayloadPedido | WebhookPayloadPostulacionMayorista,
  logContext: Record<string, string>,
): Promise<void> {
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
        evento: payload.evento,
        ...logContext,
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
    evento: payload.evento,
    ...logContext,
    error: lastError,
  });
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
