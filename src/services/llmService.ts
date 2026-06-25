import { ChatMessage, DatosPedido, LLMResponse, ToolCall } from "../types/index.js";
import { config } from "../config/index.js";
import { SYSTEM_PROMPT } from "../config/systemPrompt.js";
import { logger } from "../utils/logger.js";

// ─── Definición de la tool procesar_pedido ────────────────────────────────────

const PROCESAR_PEDIDO_TOOL_DESCRIPTION = `
Llama a esta función SOLO cuando hayas recolectado y confirmado con el cliente
TODOS los datos obligatorios del pedido: nombre_cliente, direccion_envio y al
menos un producto con cantidad. Invocarla dispara el registro del pedido.
`.trim();

// ─── Proveedor: Anthropic ─────────────────────────────────────────────────────

async function callAnthropic(
  history: ChatMessage[],
): Promise<LLMResponse> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: config.llm.anthropicApiKey });

  const messages = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const response = await client.messages.create({
    model: config.llm.model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "procesar_pedido",
        description: PROCESAR_PEDIDO_TOOL_DESCRIPTION,
        input_schema: {
          type: "object" as const,
          properties: {
            nombre_cliente: {
              type: "string",
              description: "Nombre completo del cliente",
            },
            telefono: {
              type: "string",
              description: "Número de WhatsApp del cliente (con código de país)",
            },
            direccion_envio: {
              type: "string",
              description: "Dirección completa de entrega",
            },
            productos: {
              type: "array",
              description: "Lista de productos pedidos",
              items: {
                type: "object",
                properties: {
                  nombre: { type: "string" },
                  cantidad: { type: "number" },
                  sabores: {
                    type: "array",
                    items: { type: "string" },
                    description: "Sabores o variantes elegidas",
                  },
                  notas: { type: "string" },
                },
                required: ["nombre", "cantidad"],
              },
            },
            aclaraciones: {
              type: "string",
              description: "Alergias, dedicatorias u otras aclaraciones",
            },
          },
          required: ["nombre_cliente", "telefono", "direccion_envio", "productos"],
        },
      },
    ],
    messages,
  });

  const toolCalls: ToolCall[] = [];
  let text: string | null = null;

  for (const block of response.content) {
    if (block.type === "text") {
      text = block.text;
    } else if (block.type === "tool_use") {
      toolCalls.push({
        name: block.name,
        arguments: block.input as Record<string, unknown>,
      });
    }
  }

  return { text, toolCalls };
}

// ─── Proveedor: OpenAI ────────────────────────────────────────────────────────

async function callOpenAI(
  history: ChatMessage[],
): Promise<LLMResponse> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: config.llm.openaiApiKey });

  type OAIMessage = { role: "system" | "user" | "assistant"; content: string };
  const messages: OAIMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  const response = await client.chat.completions.create({
    model: config.llm.model,
    max_tokens: 1024,
    tools: [
      {
        type: "function",
        function: {
          name: "procesar_pedido",
          description: PROCESAR_PEDIDO_TOOL_DESCRIPTION,
          parameters: {
            type: "object",
            properties: {
              nombre_cliente: { type: "string" },
              telefono: { type: "string" },
              direccion_envio: { type: "string" },
              productos: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    nombre: { type: "string" },
                    cantidad: { type: "number" },
                    sabores: { type: "array", items: { type: "string" } },
                    notas: { type: "string" },
                  },
                  required: ["nombre", "cantidad"],
                },
              },
              aclaraciones: { type: "string" },
            },
            required: ["nombre_cliente", "telefono", "direccion_envio", "productos"],
          },
        },
      },
    ],
    tool_choice: "auto",
    messages,
  });

  const choice = response.choices[0];
  const toolCalls: ToolCall[] = [];
  let text: string | null = null;

  if (choice?.message.content) {
    text = choice.message.content;
  }

  for (const tc of choice?.message.tool_calls ?? []) {
    toolCalls.push({
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    });
  }

  return { text, toolCalls };
}

// ─── Export principal ─────────────────────────────────────────────────────────

/**
 * Invoca el LLM configurado con el historial de la sesión.
 * Devuelve texto de respuesta y/o tool calls.
 */
export async function callLLM(history: ChatMessage[]): Promise<LLMResponse> {
  logger.debug("Calling LLM", {
    provider: config.llm.provider,
    model: config.llm.model,
    historyLength: history.length,
  });

  try {
    if (config.llm.provider === "anthropic") {
      return await callAnthropic(history);
    }
    return await callOpenAI(history);
  } catch (err) {
    logger.error("LLM call failed", { error: err });
    throw err;
  }
}

/**
 * Type guard: verifica que los argumentos de la tool sean un DatosPedido válido.
 */
export function parseDatosPedido(args: Record<string, unknown>): DatosPedido {
  if (
    typeof args["nombre_cliente"] !== "string" ||
    typeof args["telefono"] !== "string" ||
    typeof args["direccion_envio"] !== "string" ||
    !Array.isArray(args["productos"])
  ) {
    throw new Error("Tool arguments do not match DatosPedido schema");
  }

  return {
    nombre_cliente: args["nombre_cliente"],
    telefono: args["telefono"],
    direccion_envio: args["direccion_envio"],
    productos: args["productos"] as DatosPedido["productos"],
    aclaraciones:
      typeof args["aclaraciones"] === "string" ? args["aclaraciones"] : undefined,
  };
}
