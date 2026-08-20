import { db, getConfig } from './db.js';
import { aCantidadBase } from '../shared/units.js';
import type {
  Insumo,
  Preparacion,
  PreparacionComponente,
  Receta,
  RecetaIngrediente,
  PackagingComponente,
  Producto,
} from '../shared/types.js';

export class CircularRefError extends Error {}

// ---------- Insumos ----------

export function insumoCostoUnitario(insumo: Insumo): number {
  if (insumo.cantidad_por_compra <= 0) return 0;
  return insumo.costo_compra / insumo.cantidad_por_compra;
}

export type Semaforo = 'verde' | 'amarillo' | 'rojo';

export function diasDesdeActualizacion(fechaCosto: string | null): number | null {
  if (!fechaCosto) return null;
  const fecha = new Date(fechaCosto);
  const hoy = new Date();
  const ms = hoy.getTime() - fecha.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function semaforoInsumo(fechaCosto: string | null): Semaforo {
  const dias = diasDesdeActualizacion(fechaCosto);
  const umbralAmarillo = Number(getConfig('umbral_dias_amarillo') ?? 15);
  const umbralRojo = Number(getConfig('umbral_dias_rojo') ?? 30);
  if (dias === null) return 'rojo';
  if (dias > umbralRojo) return 'rojo';
  if (dias >= umbralAmarillo) return 'amarillo';
  return 'verde';
}

// ---------- Componentes genéricos (insumo o preparación) ----------

interface CostoComponente {
  costoParcial: number;
  costoUnitarioReferencia: number;
  desactualizado: boolean;
  nombreReferencia: string;
}

function resolverComponente(
  tipo: 'insumo' | 'preparacion',
  referenciaId: number,
  cantidad: number,
  unidad: string,
  visitando: Set<string>
): CostoComponente {
  if (tipo === 'insumo') {
    const insumo = db.prepare('SELECT * FROM insumos WHERE id = ?').get(referenciaId) as
      | Insumo
      | undefined;
    if (!insumo) {
      return { costoParcial: 0, costoUnitarioReferencia: 0, desactualizado: true, nombreReferencia: '(insumo eliminado)' };
    }
    const costoUnitario = insumoCostoUnitario(insumo);
    const cantidadBase = aCantidadBase(unidad, cantidad);
    return {
      costoParcial: cantidadBase * costoUnitario,
      costoUnitarioReferencia: costoUnitario,
      desactualizado: semaforoInsumo(insumo.fecha_costo) === 'rojo',
      nombreReferencia: insumo.nombre,
    };
  }

  const prep = calcularPreparacion(referenciaId, visitando);
  const cantidadEnUnidadDeRinde = aCantidadBase(unidad, cantidad);
  return {
    costoParcial: cantidadEnUnidadDeRinde * prep.costoPorUnidad,
    costoUnitarioReferencia: prep.costoPorUnidad,
    desactualizado: prep.desactualizado,
    nombreReferencia: prep.nombre,
  };
}

// ---------- Preparaciones ----------

export interface PreparacionCalculada {
  nombre: string;
  costoTotal: number;
  costoPorUnidad: number;
  desactualizado: boolean;
  componentes: Array<{
    id: number;
    tipo: 'insumo' | 'preparacion';
    referenciaId: number;
    nombre: string;
    cantidad: number;
    unidad: string;
    costoUnitarioReferencia: number;
    costoParcial: number;
    porcentaje: number;
    desactualizado: boolean;
  }>;
}

export function calcularPreparacion(
  preparacionId: number,
  visitando: Set<string> = new Set()
): PreparacionCalculada {
  const clave = `preparacion:${preparacionId}`;
  if (visitando.has(clave)) {
    throw new CircularRefError(
      `Referencia circular detectada: la preparación #${preparacionId} termina usándose a sí misma.`
    );
  }
  const prep = db.prepare('SELECT * FROM preparaciones WHERE id = ?').get(preparacionId) as
    | Preparacion
    | undefined;
  if (!prep) throw new Error(`Preparación #${preparacionId} no existe`);

  const nuevoVisitando = new Set(visitando);
  nuevoVisitando.add(clave);

  const componentesRaw = db
    .prepare('SELECT * FROM preparacion_componentes WHERE preparacion_id = ? ORDER BY orden')
    .all(preparacionId) as PreparacionComponente[];

  let costoTotal = 0;
  let desactualizado = false;
  const resueltos = componentesRaw.map((c) => {
    const r = resolverComponente(c.tipo, c.referencia_id, c.cantidad, c.unidad, nuevoVisitando);
    costoTotal += r.costoParcial;
    if (r.desactualizado) desactualizado = true;
    return { c, r };
  });

  const componentes = resueltos.map(({ c, r }) => ({
    id: c.id,
    tipo: c.tipo,
    referenciaId: c.referencia_id,
    nombre: r.nombreReferencia,
    cantidad: c.cantidad,
    unidad: c.unidad,
    costoUnitarioReferencia: r.costoUnitarioReferencia,
    costoParcial: r.costoParcial,
    porcentaje: costoTotal > 0 ? r.costoParcial / costoTotal : 0,
    desactualizado: r.desactualizado,
  }));

  const costoPorUnidad = prep.rinde_cantidad > 0 ? costoTotal / prep.rinde_cantidad : 0;

  return { nombre: prep.nombre, costoTotal, costoPorUnidad, desactualizado, componentes };
}

// ---------- Recetas ----------

export interface RecetaCalculada {
  nombre: string;
  clasificacion: string;
  rendimiento: number;
  rendimientoUnidad: string;
  costoTotal: number;
  costoPorUnidad: number;
  desactualizado: boolean;
  ingredientes: Array<{
    id: number;
    tipo: 'insumo' | 'preparacion';
    referenciaId: number;
    nombre: string;
    cantidad: number;
    unidad: string;
    costoUnitarioReferencia: number;
    costoParcial: number;
    porcentaje: number;
    desactualizado: boolean;
  }>;
}

export function calcularReceta(recetaId: number): RecetaCalculada {
  const receta = db.prepare('SELECT * FROM recetas WHERE id = ?').get(recetaId) as
    | Receta
    | undefined;
  if (!receta) throw new Error(`Receta #${recetaId} no existe`);

  const ingredientesRaw = db
    .prepare('SELECT * FROM receta_ingredientes WHERE receta_id = ? ORDER BY orden')
    .all(recetaId) as RecetaIngrediente[];

  let costoTotal = 0;
  let desactualizado = false;
  const resueltos = ingredientesRaw.map((i) => {
    const visitando = new Set<string>();
    const r = resolverComponente(i.tipo, i.referencia_id, i.cantidad, i.unidad, visitando);
    costoTotal += r.costoParcial;
    if (r.desactualizado) desactualizado = true;
    return { i, r };
  });

  const ingredientes = resueltos.map(({ i, r }) => ({
    id: i.id,
    tipo: i.tipo,
    referenciaId: i.referencia_id,
    nombre: r.nombreReferencia,
    cantidad: i.cantidad,
    unidad: i.unidad,
    costoUnitarioReferencia: r.costoUnitarioReferencia,
    costoParcial: r.costoParcial,
    porcentaje: costoTotal > 0 ? r.costoParcial / costoTotal : 0,
    desactualizado: r.desactualizado,
  }));

  const costoPorUnidad = receta.rendimiento > 0 ? costoTotal / receta.rendimiento : 0;

  return {
    nombre: receta.nombre,
    clasificacion: receta.clasificacion,
    rendimiento: receta.rendimiento,
    rendimientoUnidad: receta.rendimiento_unidad,
    costoTotal,
    costoPorUnidad,
    desactualizado,
    ingredientes,
  };
}

// ---------- Packaging ----------

export function calcularPackaging(armadoId: number): number {
  const componentes = db
    .prepare('SELECT * FROM packaging_componentes WHERE armado_id = ?')
    .all(armadoId) as PackagingComponente[];
  let total = 0;
  for (const c of componentes) {
    const insumo = db.prepare('SELECT * FROM insumos WHERE id = ?').get(c.insumo_id) as
      | Insumo
      | undefined;
    if (!insumo) continue;
    const cantidadBase = aCantidadBase(c.unidad, c.cantidad);
    total += cantidadBase * insumoCostoUnitario(insumo);
  }
  return total;
}

// ---------- Productos ----------

export interface ProductoCalculado {
  nombre: string;
  tipo: 'individual' | 'combo';
  costoMateriaPrima: number;
  costoPackaging: number;
  costoTotal: number;
  precioActual: number;
  margenObjetivo: number;
  margenActual: number;
  markupActual: number;
  precioSugerido: number;
  diferenciaPesos: number;
  diferenciaPorcentaje: number;
  desactualizado: boolean;
  recetas: Array<{
    recetaId: number;
    nombre: string;
    cantidad: number;
    costoUnitario: number;
    costoParcial: number;
    desactualizado: boolean;
  }>;
}

export function calcularProducto(productoId: number): ProductoCalculado {
  const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(productoId) as
    | Producto
    | undefined;
  if (!producto) throw new Error(`Producto #${productoId} no existe`);

  const items = db
    .prepare('SELECT * FROM producto_recetas WHERE producto_id = ?')
    .all(productoId) as Array<{ id: number; receta_id: number; cantidad: number }>;

  let costoMateriaPrima = 0;
  let desactualizado = false;
  const recetas = items.map((item) => {
    const r = calcularReceta(item.receta_id);
    const costoParcial = r.costoPorUnidad * item.cantidad;
    costoMateriaPrima += costoParcial;
    if (r.desactualizado) desactualizado = true;
    return {
      recetaId: item.receta_id,
      nombre: r.nombre,
      cantidad: item.cantidad,
      costoUnitario: r.costoPorUnidad,
      costoParcial,
      desactualizado: r.desactualizado,
    };
  });

  const costoPackaging = producto.packaging_armado_id
    ? calcularPackaging(producto.packaging_armado_id)
    : 0;

  const costoTotal = costoMateriaPrima + costoPackaging;
  const margenObjetivo =
    producto.margen_objetivo ?? Number(getConfig('margen_objetivo_default') ?? 0.7);

  const margenActual =
    producto.precio_actual > 0 ? (producto.precio_actual - costoTotal) / producto.precio_actual : 0;
  const markupActual = costoTotal > 0 ? producto.precio_actual / costoTotal : 0;
  const precioSugerido = margenObjetivo < 1 ? costoTotal / (1 - margenObjetivo) : 0;
  const diferenciaPesos = precioSugerido - producto.precio_actual;
  const diferenciaPorcentaje =
    producto.precio_actual > 0 ? diferenciaPesos / producto.precio_actual : 0;

  return {
    nombre: producto.nombre,
    tipo: producto.tipo,
    costoMateriaPrima,
    costoPackaging,
    costoTotal,
    precioActual: producto.precio_actual,
    margenObjetivo,
    margenActual,
    markupActual,
    precioSugerido,
    diferenciaPesos,
    diferenciaPorcentaje,
    desactualizado,
    recetas,
  };
}

// ---------- Impacto de insumos en toda la carta (para el dashboard) ----------

function acumularInsumosDeComponente(
  tipo: 'insumo' | 'preparacion',
  referenciaId: number,
  cantidad: number,
  unidad: string,
  acumulador: Map<number, { nombre: string; costo: number }>,
  visitando: Set<string>
) {
  if (tipo === 'insumo') {
    const insumo = db.prepare('SELECT * FROM insumos WHERE id = ?').get(referenciaId) as
      | Insumo
      | undefined;
    if (!insumo) return;
    const costo = aCantidadBase(unidad, cantidad) * insumoCostoUnitario(insumo);
    const previo = acumulador.get(insumo.id);
    acumulador.set(insumo.id, { nombre: insumo.nombre, costo: (previo?.costo ?? 0) + costo });
    return;
  }
  const clave = `preparacion:${referenciaId}`;
  if (visitando.has(clave)) return; // circular: ya se habría reportado al calcular la preparación
  const nuevoVisitando = new Set(visitando);
  nuevoVisitando.add(clave);
  const prep = db.prepare('SELECT * FROM preparaciones WHERE id = ?').get(referenciaId) as
    | Preparacion
    | undefined;
  if (!prep || prep.rinde_cantidad <= 0) return;
  const factor = aCantidadBase(unidad, cantidad) / prep.rinde_cantidad;
  const componentes = db
    .prepare('SELECT * FROM preparacion_componentes WHERE preparacion_id = ?')
    .all(referenciaId) as PreparacionComponente[];
  for (const c of componentes) {
    acumularInsumosDeComponente(c.tipo, c.referencia_id, c.cantidad * factor, c.unidad, acumulador, nuevoVisitando);
  }
}

export interface ImpactoInsumo {
  insumoId: number;
  nombre: string;
  costo: number;
  porcentaje: number;
}

export function impactoInsumosEnCarta(): ImpactoInsumo[] {
  const acumulador = new Map<number, { nombre: string; costo: number }>();
  const productos = db.prepare('SELECT * FROM productos WHERE activo = 1').all() as Producto[];

  for (const producto of productos) {
    const items = db
      .prepare('SELECT * FROM producto_recetas WHERE producto_id = ?')
      .all(producto.id) as Array<{ receta_id: number; cantidad: number }>;
    for (const item of items) {
      const ingredientes = db
        .prepare('SELECT * FROM receta_ingredientes WHERE receta_id = ?')
        .all(item.receta_id) as RecetaIngrediente[];
      const receta = db.prepare('SELECT * FROM recetas WHERE id = ?').get(item.receta_id) as
        | Receta
        | undefined;
      if (!receta || receta.rendimiento <= 0) continue;
      const factor = item.cantidad / receta.rendimiento;
      for (const ing of ingredientes) {
        acumularInsumosDeComponente(
          ing.tipo,
          ing.referencia_id,
          ing.cantidad * factor,
          ing.unidad,
          acumulador,
          new Set()
        );
      }
    }
    if (producto.packaging_armado_id) {
      const componentes = db
        .prepare('SELECT * FROM packaging_componentes WHERE armado_id = ?')
        .all(producto.packaging_armado_id) as PackagingComponente[];
      for (const c of componentes) {
        acumularInsumosDeComponente('insumo', c.insumo_id, c.cantidad, c.unidad, acumulador, new Set());
      }
    }
  }

  const total = Array.from(acumulador.values()).reduce((sum, v) => sum + v.costo, 0);
  return Array.from(acumulador.entries())
    .map(([insumoId, v]) => ({
      insumoId,
      nombre: v.nombre,
      costo: v.costo,
      porcentaje: total > 0 ? v.costo / total : 0,
    }))
    .sort((a, b) => b.costo - a.costo);
}
