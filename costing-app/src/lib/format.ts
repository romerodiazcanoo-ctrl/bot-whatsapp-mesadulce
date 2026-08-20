export function formatARS(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(valor);
}

export function formatARSDecimal(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(valor);
}

export function formatPct(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(valor);
}

export function formatFecha(iso: string | null): string {
  if (!iso) return 'sin fecha';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function redondear(valor: number, multiplo: number): number {
  if (multiplo <= 0) return Math.round(valor);
  return Math.round(valor / multiplo) * multiplo;
}
