// Conversión de unidades de compra a unidad base (g, ml, unidad).
// cantidad_por_compra en la base de datos SIEMPRE está expresada en unidad base.

export type UnidadBase = 'g' | 'ml' | 'unidad';

interface ConversionConocida {
  unidadBase: UnidadBase;
  factor: number; // 1 unidad_compra = `factor` unidades base
}

// Etiquetas de compra con conversión automática conocida.
const CONVERSIONES: Record<string, ConversionConocida> = {
  kg: { unidadBase: 'g', factor: 1000 },
  gr: { unidadBase: 'g', factor: 1 },
  g: { unidadBase: 'g', factor: 1 },
  lt: { unidadBase: 'ml', factor: 1000 },
  l: { unidadBase: 'ml', factor: 1000 },
  ml: { unidadBase: 'ml', factor: 1 },
  unidad: { unidadBase: 'unidad', factor: 1 },
  unidades: { unidadBase: 'unidad', factor: 1 },
  docena: { unidadBase: 'unidad', factor: 12 },
};

export const UNIDADES_COMPRA_SUGERIDAS = [
  'kg',
  'gr',
  'Lt',
  'ml',
  'unidades',
  'docena',
  'caja',
  'tabla',
];

/**
 * Dada una unidad de compra, devuelve su conversión conocida (factor fijo) o
 * null si es una unidad "custom" (caja, tabla, etc.) donde el usuario carga
 * directamente la cantidad ya expresada en unidad base.
 */
export function conversionConocida(unidadCompra: string): ConversionConocida | null {
  return CONVERSIONES[unidadCompra.trim().toLowerCase()] ?? null;
}

/** Unidad base que corresponde a una unidad de compra. */
export function unidadBaseDe(unidadCompra: string): UnidadBase {
  return conversionConocida(unidadCompra)?.unidadBase ?? 'unidad';
}

/**
 * Convierte una cantidad ingresada en `unidadCompra` a unidad base.
 * Si la unidad no tiene conversión fija (caja, tabla, ...) se asume que
 * `cantidadIngresada` ya está en unidad base (el usuario cuenta el contenido).
 */
export function aCantidadBase(unidadCompra: string, cantidadIngresada: number): number {
  const conv = conversionConocida(unidadCompra);
  if (!conv) return cantidadIngresada;
  return cantidadIngresada * conv.factor;
}

const ETIQUETAS_LEGIBLES: Record<UnidadBase, string> = {
  g: 'kg',
  ml: 'Lt',
  unidad: 'unidad',
};

const FACTOR_LEGIBLE: Record<UnidadBase, number> = {
  g: 1000,
  ml: 1000,
  unidad: 1,
};

/** Costo por unidad base, y su equivalente en una unidad "legible" (kg, Lt, unidad). */
export function costoLegible(costoCompra: number, cantidadBase: number, unidadBase: UnidadBase) {
  const costoUnitarioBase = cantidadBase > 0 ? costoCompra / cantidadBase : 0;
  return {
    costoUnitarioBase,
    unidadLegible: ETIQUETAS_LEGIBLES[unidadBase],
    costoLegibleValor: costoUnitarioBase * FACTOR_LEGIBLE[unidadBase],
  };
}
