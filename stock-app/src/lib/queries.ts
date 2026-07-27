import "server-only";
import { prisma } from "@/lib/prisma";
import type { Categoria } from "@/generated/prisma/enums";

export async function getVariedades() {
  return prisma.productVariety.findMany({
    orderBy: [{ categoria: "asc" }, { orden: "asc" }, { nombre: "asc" }],
  });
}

export async function getVariedadesActivas() {
  return prisma.productVariety.findMany({
    where: { activa: true },
    orderBy: [{ categoria: "asc" }, { orden: "asc" }, { nombre: "asc" }],
  });
}

export async function getStockCompleto() {
  const [varieties, stocks] = await Promise.all([
    prisma.productVariety.findMany({
      where: { activa: true },
      orderBy: [{ categoria: "asc" }, { orden: "asc" }, { nombre: "asc" }],
    }),
    prisma.stock.findMany(),
  ]);

  const stockPorVariedad = new Map<string, Map<string, number>>();
  for (const s of stocks) {
    if (!stockPorVariedad.has(s.varietyId)) stockPorVariedad.set(s.varietyId, new Map());
    stockPorVariedad.get(s.varietyId)!.set(s.etapa, s.cantidad);
  }

  return varieties.map((v) => ({
    ...v,
    crudo: stockPorVariedad.get(v.id)?.get("CRUDO") ?? 0,
    horneadoCongelado: stockPorVariedad.get(v.id)?.get("HORNEADO_CONGELADO") ?? 0,
    brownieporciones: stockPorVariedad.get(v.id)?.get("BROWNIE_PORCIONES") ?? 0,
  }));
}

export async function getPlanActivo() {
  return prisma.planProduccion.findFirst({
    where: { activo: true },
    include: { items: { include: { variety: true } }, createdBy: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPlanesHistoricos() {
  return prisma.planProduccion.findMany({
    where: { activo: false },
    include: { items: { include: { variety: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export interface ComparacionItem {
  varietyId: string;
  nombre: string;
  categoria: Categoria;
  unidadesObjetivo: number;
  stockCrudo: number;
  faltanteCrudo: number;
  disponibleParaHornear: number;
  stockHorneadoCongelado: number | null;
  disponibleParaDecorar: number | null;
}

/** Compara el plan de producción activo contra el stock disponible en cada etapa. */
export async function getComparacionPlanActivo(): Promise<ComparacionItem[]> {
  const plan = await getPlanActivo();
  if (!plan) return [];

  const varietyIds = plan.items.map((i) => i.varietyId);
  const stocks = await prisma.stock.findMany({ where: { varietyId: { in: varietyIds } } });

  const stockPorVariedad = new Map<string, Map<string, number>>();
  for (const s of stocks) {
    if (!stockPorVariedad.has(s.varietyId)) stockPorVariedad.set(s.varietyId, new Map());
    stockPorVariedad.get(s.varietyId)!.set(s.etapa, s.cantidad);
  }

  return plan.items.map((item) => {
    const stockCrudo = stockPorVariedad.get(item.varietyId)?.get("CRUDO") ?? 0;
    const esRellena = item.variety.categoria === "COOKIE_RELLENA";
    const stockHorneadoCongelado = esRellena
      ? stockPorVariedad.get(item.varietyId)?.get("HORNEADO_CONGELADO") ?? 0
      : null;

    return {
      varietyId: item.varietyId,
      nombre: item.variety.nombre,
      categoria: item.variety.categoria,
      unidadesObjetivo: item.unidadesObjetivo,
      stockCrudo,
      faltanteCrudo: Math.max(0, item.unidadesObjetivo - stockCrudo),
      disponibleParaHornear: Math.min(stockCrudo, item.unidadesObjetivo),
      stockHorneadoCongelado,
      disponibleParaDecorar: stockHorneadoCongelado,
    };
  });
}

export async function getHistorialProduccion(limit = 200) {
  return prisma.produccionEntry.findMany({
    include: { variety: true, user: true },
    orderBy: { fecha: "desc" },
    take: limit,
  });
}

export async function getUsuarios() {
  return prisma.user.findMany({ orderBy: { createdAt: "asc" } });
}
