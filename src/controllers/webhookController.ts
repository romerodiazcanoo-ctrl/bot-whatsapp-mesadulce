import { Request, Response } from "express";
import { z } from "zod";
import { WhatsAppWebhookPayload } from "../types/index.js";
import { config } from "../config/index.js";
import { sessionStore } from "../services/sessionStore.js";
import { callLLM, parseDatosPedido } from "../services/llmService.js";
import { sendTextMessage, markAsRead } from "../services/whatsappService.js";
import { dispararWebhookPedido } from "../services/outboundWebhook.js";
import { logger } from "../utils/logger.js";

// ─── Verificación del webhook (GET) ───────────────────────────────────────────

const verifySchema = z.object({
  "hub.mode": z.literal("subscribe"),
  "hub.verify_token": z.string(),
  "hub.challenge": z.string(),
});

export function verifyWebhook(req: Request, res: Response): void {
  const result = verifySchema.safeParse(req.query);
  if (!result.success) {
    res.sendStatus(400);
    return;
  }

  const { "hub.verify_token": token, "hub.challenge": challenge } = result.data;

  if (token !== config.whatsapp.verifyToken) {
    logger.warn("Webhook verification failed: wrong verify token");
    res.sendStatus(403);
    return;
  }

  logger.info("Webhook verified successfully");
  res.status(200).send(challenge);
}

// ─── Recepción de mensajes (POST) ─────────────────────────────────────────────

export async function handleIncomingMessage(
  req: Request,
  res: Response,
): Promise<void> {
  // Respondemos 200 inmediatamente para que Meta no reintente el webhook
  res.sendStatus(200);

  const payload = req.body as WhatsAppWebhookPayload;

  if (payload.object !== "whatsapp_business_account") return;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;

      const value = change.value;
      const messages = value.messages ?? [];
      const contacts = value.contacts ?? [];

      for (const message of messages) {
        // Solo procesamos mensajes de texto
        if (message.type !== "text" || !message.text?.body) continue;

        const waId = message.from;
        const displayName =
          contacts.find((c) => c.wa_id === waId)?.profile.name ?? waId;
        const userText = message.text.body.trim();

        logger.info("Incoming message", {
          from: waId,
          name: displayName,
          text: userText.slice(0, 80),
        });

        // Procesar de forma asíncrona sin bloquear
        processMessage(waId, displayName, userText, message.id).catch((err) => {
          logger.error("Error processing message", { waId, error: err });
        });
      }
    }
  }
}

// ─── Lógica de procesamiento ──────────────────────────────────────────────────

async function processMessage(
  waId: string,
  displayName: string,
  userText: string,
  messageId: string,
): Promise<void> {
  // Marcamos como leído para mejor UX
  await markAsRead(messageId);

  // Obtenemos/creamos sesión
  const session = await sessionStore.getOrCreate(waId, displayName);

  // Agregamos el mensaje del usuario al historial
  await sessionStore.addMessage(waId, { role: "user", content: userText });

  // Obtenemos la sesión actualizada para pasarla al LLM
  const updatedSession = await sessionStore.get(waId);
  if (!updatedSession) return;

  // Llamamos al LLM
  let llmResponse;
  try {
    llmResponse = await callLLM(updatedSession.history);
  } catch {
    await sendTextMessage(
      waId,
      "Ups, tuve un problemita técnico. ¿Podés repetirme eso? 😅",
    );
    return;
  }

  // Procesamos tool calls primero
  for (const toolCall of llmResponse.toolCalls) {
    if (toolCall.name === "procesar_pedido") {
      logger.info("Tool call: procesar_pedido", { waId, args: toolCall.arguments });

      try {
        const datos = parseDatosPedido({
          ...toolCall.arguments,
          // El teléfono viene del waId (número de WhatsApp con código de país)
          telefono: waId,
        });

        await dispararWebhookPedido(datos);

        logger.info("Pedido procesado", {
          cliente: datos.nombre_cliente,
          productos: datos.productos.length,
        });
      } catch (err) {
        logger.error("Error procesando pedido", { waId, error: err });
      }
    }
  }

  // Enviamos la respuesta de texto al usuario (si existe)
  if (llmResponse.text) {
    await sessionStore.addMessage(waId, {
      role: "assistant",
      content: llmResponse.text,
    });
    await sendTextMessage(waId, llmResponse.text);
  }

  void session; // referencia usada para logs futuros
}
