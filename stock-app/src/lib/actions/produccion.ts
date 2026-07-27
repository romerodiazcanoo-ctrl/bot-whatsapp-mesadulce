"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActionSession } from "@/lib/auth-guard";

const PORCIONES_POR_PLANCHA = 12;

const produccionSchema = z.object({
  varietyId: z.string().min(1),
  pesoMasaGramos: z.coerce.number().positive().optional(),
  unidadesDirectas: z.coerce.number().min(0).optional(),
  planchas: z.coerce.number().min(0).optional(),
  fecha: z.string().optional(),
  nota: z.string().trim().max(500).optional(),
});

export type CargarProduccionResult =
  | { ok: true; unidadesResultantes: number }
  | { ok: false; error: string };

/** Carga una entrada de producción: calcula el rendimiento en unidades y lo suma al stock correspondiente. */
export async function cargarProduccion(formData: FormData): Promise<CargarProduccionResult> {
  const session = await getActionSession("EDITOR");
  if (!session) return { ok: false, error: "No tenés permiso para cargar producción." };

  const parsed = produccionSchema.safeParse({
    varietyId: formData.get("varietyId"),
    pesoMasaGramos: formData.get("pesoMasaGramos") || undefined,
    unidadesDirectas: formData.get("unidadesDirectas") || undefined,
    planchas: formData.get("planchas") || undefined,
    fecha: formData.get("fecha") || undefined,
    nota: formData.get("nota") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { varietyId, pesoMasaGramos, unidadesDirectas, planchas, fecha, nota } = parsed.data;

  const variety = await prisma.productVariety.findUnique({ where: { id: varietyId } });
  if (!variety) return { ok: false, error: "La variedad indicada no existe." };

  let unidadesResultantes: number;
  let etapaDestino: "CRUDO" | "BROWNIE_PORCIONES";
  let pesoParaGuardar: number | null = null;

  if (variety.categoria === "BROWNIE") {
    const porciones = (unidadesDirectas ?? 0) + (planchas ?? 0) * PORCIONES_POR_PLANCHA;
    if (porciones <= 0) {
      return { ok: false, error: "Ingresá porciones sueltas y/o planchas producidas." };
    }
    unidadesResultantes = porciones;
    etapaDestino = "BROWNIE_PORCIONES";
  } else {
    if (!variety.pesoUnitarioGramos) {
      return { ok: false, error: "Esta variedad no tiene definido un peso unitario de referencia." };
    }
    if (!pesoMasaGramos) {
      return { ok: false, error: "Ingresá el peso total de masa producida (en gramos)." };
    }
    unidadesResultantes = Math.round((pesoMasaGramos / variety.pesoUnitarioGramos) * 100) / 100;
    etapaDestino = "CRUDO";
    pesoParaGuardar = pesoMasaGramos;
  }

  await prisma.$transaction(async (tx) => {
    const stockActual = await tx.stock.upsert({
      where: { varietyId_etapa: { varietyId, etapa: etapaDestino } },
      update: {},
      create: { varietyId, etapa: etapaDestino, cantidad: 0 },
    });
    const nuevaCantidad = stockActual.cantidad + unidadesResultantes;

    await tx.stock.update({
      where: { varietyId_etapa: { varietyId, etapa: etapaDestino } },
      data: { cantidad: nuevaCantidad },
    });

    await tx.stockMovimiento.create({
      data: {
        varietyId,
        etapa: etapaDestino,
        tipo: "PRODUCCION",
        cantidadDelta: unidadesResultantes,
        cantidadResultante: nuevaCantidad,
        nota,
        userId: session.user.id,
      },
    });

    await tx.produccionEntry.create({
      data: {
        varietyId,
        pesoMasaGramos: pesoParaGuardar,
        unidadesResultantes,
        nota,
        userId: session.user.id,
        fecha: fecha ? new Date(fecha) : new Date(),
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/produccion/historial");
  revalidatePath("/stock");
  return { ok: true, unidadesResultantes };
}
