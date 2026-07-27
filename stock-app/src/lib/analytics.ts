import "server-only";
import { startOfWeek, format, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { prisma } from "@/lib/prisma";

export interface SerieSemanal {
  semana: string;
  inicioSemana: string;
  total: number;
  porVariedad: Record<string, number>;
}

export interface ProyeccionVariedad {
  varietyId: string;
  nombre: string;
  promedioSemanal: number;
  tendencia: "creciente" | "estable" | "decreciente";
  proyeccionProximaSemana: number;
}

const SEMANAS_HISTORIAL = 8;

export async function getProduccionSemanal() {
  const desde = startOfWeek(subWeeks(new Date(), SEMANAS_HISTORIAL - 1), { weekStartsOn: 1 });

  const entries = await prisma.produccionEntry.findMany({
    where: { fecha: { gte: desde } },
    include: { variety: true },
    orderBy: { fecha: "asc" },
  });

  const semanas: SerieSemanal[] = [];
  const indexPorSemana = new Map<string, number>();

  for (let i = 0; i < SEMANAS_HISTORIAL; i++) {
    const inicio = startOfWeek(subWeeks(new Date(), SEMANAS_HISTORIAL - 1 - i), { weekStartsOn: 1 });
    const key = format(inicio, "yyyy-MM-dd");
    indexPorSemana.set(key, semanas.length);
    semanas.push({
      semana: format(inicio, "'sem.' d MMM", { locale: es }),
      inicioSemana: key,
      total: 0,
      porVariedad: {},
    });
  }

  for (const entry of entries) {
    const inicio = startOfWeek(entry.fecha, { weekStartsOn: 1 });
    const key = format(inicio, "yyyy-MM-dd");
    const idx = indexPorSemana.get(key);
    if (idx === undefined) continue;
    semanas[idx].total += entry.unidadesResultantes;
    semanas[idx].porVariedad[entry.variety.nombre] =
      (semanas[idx].porVariedad[entry.variety.nombre] ?? 0) + entry.unidadesResultantes;
  }

  return semanas;
}

/** Proyección simple: promedio semanal de las últimas semanas y tendencia respecto al período anterior. */
export async function getProyeccionesPorVariedad(): Promise<ProyeccionVariedad[]> {
  const desde = startOfWeek(subWeeks(new Date(), SEMANAS_HISTORIAL - 1), { weekStartsOn: 1 });

  const entries = await prisma.produccionEntry.findMany({
    where: { fecha: { gte: desde } },
    include: { variety: true },
  });

  const porVariedad = new Map<string, { nombre: string; semanas: Map<string, number> }>();

  for (const entry of entries) {
    const inicio = format(startOfWeek(entry.fecha, { weekStartsOn: 1 }), "yyyy-MM-dd");
    if (!porVariedad.has(entry.varietyId)) {
      porVariedad.set(entry.varietyId, { nombre: entry.variety.nombre, semanas: new Map() });
    }
    const registro = porVariedad.get(entry.varietyId)!;
    registro.semanas.set(inicio, (registro.semanas.get(inicio) ?? 0) + entry.unidadesResultantes);
  }

  const resultado: ProyeccionVariedad[] = [];
  for (const [varietyId, { nombre, semanas }] of porVariedad) {
    const valores = Array.from(semanas.values());
    if (valores.length === 0) continue;

    const promedio = valores.reduce((a, b) => a + b, 0) / SEMANAS_HISTORIAL;
    const mitad = Math.floor(valores.length / 2) || 1;
    const primeraMitad = valores.slice(0, mitad);
    const segundaMitad = valores.slice(mitad);
    const promPrimera = primeraMitad.reduce((a, b) => a + b, 0) / (primeraMitad.length || 1);
    const promSegunda = segundaMitad.length
      ? segundaMitad.reduce((a, b) => a + b, 0) / segundaMitad.length
      : promPrimera;

    let tendencia: ProyeccionVariedad["tendencia"] = "estable";
    if (promSegunda > promPrimera * 1.1) tendencia = "creciente";
    else if (promSegunda < promPrimera * 0.9) tendencia = "decreciente";

    resultado.push({
      varietyId,
      nombre,
      promedioSemanal: Math.round(promedio * 10) / 10,
      tendencia,
      proyeccionProximaSemana: Math.round(promSegunda * 10) / 10,
    });
  }

  return resultado.sort((a, b) => b.promedioSemanal - a.promedioSemanal);
}
