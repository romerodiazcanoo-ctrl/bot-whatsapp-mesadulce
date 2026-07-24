// ─── WhatsApp Cloud API ──────────────────────────────────────────────────────

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: WhatsAppChangeValue;
  field: string;
}

export interface WhatsAppChangeValue {
  messaging_product: string;
  metadata: { display_phone_number: string; phone_number_id: string };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
}

export interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "image" | "audio" | "video" | "document" | "sticker" | "location" | "interactive";
  text?: { body: string };
}

export interface WhatsAppStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  recipient_id: string;
}

// ─── Sesión de chat ──────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface ChatSession {
  waId: string;          // número de WhatsApp del cliente
  displayName: string;   // nombre del perfil de WhatsApp
  history: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// ─── Pedido estructurado ─────────────────────────────────────────────────────

export interface DatosPedido {
  nombre_cliente: string;
  telefono: string;
  direccion_envio: string;
  productos: ProductoPedido[];
  aclaraciones?: string;
  total_estimado?: number;
}

export interface ProductoPedido {
  nombre: string;
  cantidad: number;
  sabores?: string[];
  notas?: string;
}

// ─── Postulación mayorista ───────────────────────────────────────────────────

export interface DatosPostulacionMayorista {
  nombre_comercio: string;
  ubicacion: string;
  instagram_web: string;
  tipo_negocio: "Cafetería de especialidad" | "Almacén / Panadería" | "Otro";
  tipo_negocio_otro?: string;
  almacenamiento: "Sí, freezer exclusivo" | "Sí, espacio compartido" | "No";
  volumen_semanal: "50 a 100 unidades" | "100 a 250 unidades" | "Más de 250 unidades";
  whatsapp_contacto: string;
  email: string;
}

// ─── Tool calling ────────────────────────────────────────────────────────────

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  text: string | null;
  toolCalls: ToolCall[];
}

// ─── Config ──────────────────────────────────────────────────────────────────

export type LLMProvider = "anthropic" | "openai";
export type SessionStore = "memory" | "redis";
