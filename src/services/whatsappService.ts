import axios, { AxiosError } from "axios";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

const http = axios.create({
  baseURL: config.whatsapp.apiBaseUrl,
  headers: {
    Authorization: `Bearer ${config.whatsapp.accessToken}`,
    "Content-Type": "application/json",
  },
  timeout: 10_000,
});

/**
 * Envía un mensaje de texto plano al número de WhatsApp indicado.
 */
export async function sendTextMessage(to: string, text: string): Promise<void> {
  try {
    await http.post("/messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text, preview_url: false },
    });
    logger.info("WhatsApp message sent", { to, preview: text.slice(0, 60) });
  } catch (err) {
    const error = err as AxiosError;
    logger.error("Failed to send WhatsApp message", {
      to,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw err;
  }
}

/**
 * Marca un mensaje como leído ("doble check azul").
 */
export async function markAsRead(messageId: string): Promise<void> {
  try {
    await http.post("/messages", {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    });
  } catch (err) {
    // No crítico: solo loguear
    logger.warn("Could not mark message as read", { messageId });
  }
}
