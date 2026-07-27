"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActionSession } from "@/lib/auth-guard";
import type { ActionResult } from "@/lib/actions/stock";

const nuevoUsuarioSchema = z.object({
  email: z.email("Ingresá un email de Gmail válido"),
  name: z.string().trim().max(200).optional(),
  role: z.enum(["ADMIN", "EDITOR", "LECTOR"]),
});

export async function crearUsuario(formData: FormData): Promise<ActionResult> {
  const session = await getActionSession("ADMIN");
  if (!session) return { ok: false, error: "Solo el administrador puede otorgar accesos." };

  const parsed = nuevoUsuarioSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { email, name, role } = parsed.data;

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    return { ok: false, error: "Ya existe un usuario con ese email." };
  }

  await prisma.user.create({
    data: { email, name, role, isAuthorized: true },
  });

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

const actualizarUsuarioSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "EDITOR", "LECTOR"]),
  isAuthorized: z.coerce.boolean(),
});

export async function actualizarUsuario(formData: FormData): Promise<ActionResult> {
  const session = await getActionSession("ADMIN");
  if (!session) return { ok: false, error: "Solo el administrador puede modificar usuarios." };

  const parsed = actualizarUsuarioSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    isAuthorized: formData.get("isAuthorized") === "on" || formData.get("isAuthorized") === "true",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role, isAuthorized: parsed.data.isAuthorized },
  });

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

/** Libera el dispositivo autorizado de un usuario: en su próximo login, el dispositivo que use quedará vinculado. */
export async function reautorizarDispositivo(userId: string): Promise<ActionResult> {
  const session = await getActionSession("ADMIN");
  if (!session) return { ok: false, error: "Solo el administrador puede reautorizar dispositivos." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "Usuario no encontrado." };

  await prisma.user.update({
    where: { id: userId },
    data: {
      deviceId: user.pendingDeviceId ?? null,
      deviceLabel: user.pendingDeviceLabel ?? null,
      deviceBoundAt: user.pendingDeviceId ? new Date() : null,
      pendingDeviceId: null,
      pendingDeviceLabel: null,
      pendingDeviceRequestedAt: null,
    },
  });

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function revocarAcceso(userId: string): Promise<ActionResult> {
  const session = await getActionSession("ADMIN");
  if (!session) return { ok: false, error: "Solo el administrador puede revocar accesos." };

  await prisma.user.update({ where: { id: userId }, data: { isAuthorized: false } });
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

const nuevaVariedadSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá un nombre"),
  categoria: z.enum(["COOKIE_CLASICA", "COOKIE_RELLENA", "BROWNIE"]),
  pesoUnitarioGramos: z.coerce.number().positive().optional(),
});

export async function crearVariedad(formData: FormData): Promise<ActionResult> {
  const session = await getActionSession("ADMIN");
  if (!session) return { ok: false, error: "Solo el administrador puede agregar variedades." };

  const parsed = nuevaVariedadSchema.safeParse({
    nombre: formData.get("nombre"),
    categoria: formData.get("categoria"),
    pesoUnitarioGramos: formData.get("pesoUnitarioGramos") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { nombre, categoria, pesoUnitarioGramos } = parsed.data;

  if (categoria !== "BROWNIE" && !pesoUnitarioGramos) {
    return { ok: false, error: "Las variedades de cookie necesitan un peso unitario de referencia." };
  }

  const existente = await prisma.productVariety.findUnique({ where: { nombre } });
  if (existente) return { ok: false, error: "Ya existe una variedad con ese nombre." };

  const variety = await prisma.productVariety.create({
    data: {
      nombre,
      categoria,
      pesoUnitarioGramos: categoria === "BROWNIE" ? null : pesoUnitarioGramos,
    },
  });

  const etapas =
    categoria === "BROWNIE"
      ? (["BROWNIE_PORCIONES"] as const)
      : categoria === "COOKIE_RELLENA"
        ? (["CRUDO", "HORNEADO_CONGELADO"] as const)
        : (["CRUDO"] as const);

  await prisma.stock.createMany({
    data: etapas.map((etapa) => ({ varietyId: variety.id, etapa, cantidad: 0 })),
  });

  revalidatePath("/admin/variedades");
  revalidatePath("/");
  return { ok: true };
}

const actualizarVariedadSchema = z.object({
  varietyId: z.string().min(1),
  activa: z.coerce.boolean(),
  pesoUnitarioGramos: z.coerce.number().positive().optional(),
});

export async function actualizarVariedad(formData: FormData): Promise<ActionResult> {
  const session = await getActionSession("ADMIN");
  if (!session) return { ok: false, error: "Solo el administrador puede editar variedades." };

  const parsed = actualizarVariedadSchema.safeParse({
    varietyId: formData.get("varietyId"),
    activa: formData.get("activa") === "on" || formData.get("activa") === "true",
    pesoUnitarioGramos: formData.get("pesoUnitarioGramos") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  await prisma.productVariety.update({
    where: { id: parsed.data.varietyId },
    data: {
      activa: parsed.data.activa,
      ...(parsed.data.pesoUnitarioGramos ? { pesoUnitarioGramos: parsed.data.pesoUnitarioGramos } : {}),
    },
  });

  revalidatePath("/admin/variedades");
  revalidatePath("/");
  return { ok: true };
}
