import { Request, Response } from "express";
import { z } from "zod";
import { dispararWebhookMayorista } from "../services/outboundWebhook.js";
import { logger } from "../utils/logger.js";

const postulacionSchema = z
  .object({
    nombre_comercio: z.string().trim().min(1),
    ubicacion: z.string().trim().min(1),
    instagram_web: z.string().trim().min(1),
    tipo_negocio: z.enum([
      "Cafetería de especialidad",
      "Almacén / Panadería",
      "Otro",
    ]),
    tipo_negocio_otro: z.string().trim().optional(),
    almacenamiento: z.enum(["Sí, freezer exclusivo", "Sí, espacio compartido", "No"]),
    volumen_semanal: z.enum(["50 a 100 unidades", "100 a 250 unidades", "Más de 250 unidades"]),
    whatsapp_contacto: z.string().trim().min(1),
    email: z.string().trim().email(),
  })
  .refine((data) => data.tipo_negocio !== "Otro" || !!data.tipo_negocio_otro, {
    message: "tipo_negocio_otro es requerido cuando tipo_negocio es 'Otro'",
    path: ["tipo_negocio_otro"],
  });

export async function submitPostulacionMayorista(
  req: Request,
  res: Response,
): Promise<void> {
  const result = postulacionSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: "Datos inválidos", detalles: result.error.flatten() });
    return;
  }

  try {
    await dispararWebhookMayorista(result.data);
    logger.info("Postulación mayorista recibida", { comercio: result.data.nombre_comercio });
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error("Error procesando postulación mayorista", { error: err });
    res.status(502).json({ error: "No se pudo registrar la postulación. Intentá de nuevo." });
  }
}
