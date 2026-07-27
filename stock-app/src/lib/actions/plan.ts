"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActionSession } from "@/lib/auth-guard";
import { getVariedadesActivas } from "@/lib/queries";
import type { ActionResult } from "@/lib/actions/stock";

const planSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá un nombre para el plan"),
  fechaInicio: z.string().min(1, "Ingresá la fecha de inicio"),
  fechaFin: z.string().min(1, "Ingresá la fecha de fin"),
});

/** Crea un nuevo plan de producción activo a partir de las cantidades objetivo por variedad del formulario. */
export async function crearPlanProduccion(formData: FormData): Promise<ActionResult> {
  const session = await getActionSession("EDITOR");
  if (!session) return { ok: false, error: "No tenés permiso para cargar el plan de producción." };

  const parsed = planSchema.safeParse({
    nombre: formData.get("nombre"),
    fechaInicio: formData.get("fechaInicio"),
    fechaFin: formData.get("fechaFin"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { nombre, fechaInicio, fechaFin } = parsed.data;

  const variedades = await getVariedadesActivas();
  const items = variedades
    .map((v) => ({
      varietyId: v.id,
      unidadesObjetivo: Number(formData.get(`unidades_${v.id}`) ?? 0),
    }))
    .filter((i) => i.unidadesObjetivo > 0);

  if (items.length === 0) {
    return { ok: false, error: "Ingresá al menos una cantidad objetivo mayor a 0." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.planProduccion.updateMany({ where: { activo: true }, data: { activo: false } });
    await tx.planProduccion.create({
      data: {
        nombre,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        activo: true,
        createdById: session.user.id,
        items: { create: items },
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/produccion/plan");
  return { ok: true };
}

export async function desactivarPlan(planId: string): Promise<ActionResult> {
  const session = await getActionSession("EDITOR");
  if (!session) return { ok: false, error: "No tenés permiso para modificar el plan." };

  await prisma.planProduccion.update({ where: { id: planId }, data: { activo: false } });
  revalidatePath("/");
  revalidatePath("/produccion/plan");
  return { ok: true };
}
