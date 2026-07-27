"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActionSession } from "@/lib/auth-guard";

const ajusteSchema = z.object({
  varietyId: z.string().min(1),
  etapa: z.enum(["CRUDO", "HORNEADO_CONGELADO", "BROWNIE_PORCIONES"]),
  nuevaCantidad: z.coerce.number().min(0, "La cantidad no puede ser negativa"),
  nota: z.string().trim().max(500).optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function ajustarStock(formData: FormData): Promise<ActionResult> {
  const session = await getActionSession("EDITOR");
  if (!session) return { ok: false, error: "No tenés permiso para ajustar el stock." };

  const parsed = ajusteSchema.safeParse({
    varietyId: formData.get("varietyId"),
    etapa: formData.get("etapa"),
    nuevaCantidad: formData.get("nuevaCantidad"),
    nota: formData.get("nota") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { varietyId, etapa, nuevaCantidad, nota } = parsed.data;

  const variety = await prisma.productVariety.findUnique({ where: { id: varietyId } });
  if (!variety) return { ok: false, error: "La variedad indicada no existe." };

  await prisma.$transaction(async (tx) => {
    const actual = await tx.stock.upsert({
      where: { varietyId_etapa: { varietyId, etapa } },
      update: {},
      create: { varietyId, etapa, cantidad: 0 },
    });

    const delta = nuevaCantidad - actual.cantidad;

    await tx.stock.update({
      where: { varietyId_etapa: { varietyId, etapa } },
      data: { cantidad: nuevaCantidad },
    });

    await tx.stockMovimiento.create({
      data: {
        varietyId,
        etapa,
        tipo: "AJUSTE_MANUAL",
        cantidadDelta: delta,
        cantidadResultante: nuevaCantidad,
        nota,
        userId: session.user.id,
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/stock");
  return { ok: true };
}

const hornearSchema = z.object({
  varietyId: z.string().min(1),
  unidades: z.coerce.number().positive("Ingresá una cantidad mayor a 0"),
  nota: z.string().trim().max(500).optional(),
});

/** Mueve unidades de stock crudo a horneado/congelado (solo cookies rellenas). */
export async function registrarHorneado(formData: FormData): Promise<ActionResult> {
  const session = await getActionSession("EDITOR");
  if (!session) return { ok: false, error: "No tenés permiso para registrar horneado." };

  const parsed = hornearSchema.safeParse({
    varietyId: formData.get("varietyId"),
    unidades: formData.get("unidades"),
    nota: formData.get("nota") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { varietyId, unidades, nota } = parsed.data;

  const variety = await prisma.productVariety.findUnique({ where: { id: varietyId } });
  if (!variety) return { ok: false, error: "La variedad indicada no existe." };
  if (variety.categoria !== "COOKIE_RELLENA") {
    return { ok: false, error: "El horneado solo aplica a cookies rellenas." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const crudo = await tx.stock.upsert({
        where: { varietyId_etapa: { varietyId, etapa: "CRUDO" } },
        update: {},
        create: { varietyId, etapa: "CRUDO", cantidad: 0 },
      });
      if (crudo.cantidad < unidades) {
        throw new Error(
          `Solo hay ${crudo.cantidad} unidades crudas disponibles de ${variety.nombre}.`,
        );
      }

      const horneado = await tx.stock.upsert({
        where: { varietyId_etapa: { varietyId, etapa: "HORNEADO_CONGELADO" } },
        update: {},
        create: { varietyId, etapa: "HORNEADO_CONGELADO", cantidad: 0 },
      });

      const nuevoCrudo = crudo.cantidad - unidades;
      const nuevoHorneado = horneado.cantidad + unidades;

      await tx.stock.update({
        where: { varietyId_etapa: { varietyId, etapa: "CRUDO" } },
        data: { cantidad: nuevoCrudo },
      });
      await tx.stock.update({
        where: { varietyId_etapa: { varietyId, etapa: "HORNEADO_CONGELADO" } },
        data: { cantidad: nuevoHorneado },
      });

      await tx.stockMovimiento.createMany({
        data: [
          {
            varietyId,
            etapa: "CRUDO",
            tipo: "HORNEADO_EGRESO",
            cantidadDelta: -unidades,
            cantidadResultante: nuevoCrudo,
            nota,
            userId: session.user.id,
          },
          {
            varietyId,
            etapa: "HORNEADO_CONGELADO",
            tipo: "HORNEADO_INGRESO",
            cantidadDelta: unidades,
            cantidadResultante: nuevoHorneado,
            nota,
            userId: session.user.id,
          },
        ],
      });
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo registrar el horneado." };
  }

  revalidatePath("/");
  revalidatePath("/stock");
  return { ok: true };
}
