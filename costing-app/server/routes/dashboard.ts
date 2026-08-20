import { Router } from 'express';
import { db } from '../db.js';
import { semaforoInsumo, calcularProducto, impactoInsumosEnCarta } from '../calc.js';
import type { Insumo, Producto } from '../../shared/types.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', (_req, res) => {
  const insumos = db.prepare('SELECT * FROM insumos WHERE activo = 1').all() as Insumo[];
  const insumosDesactualizados = insumos.filter((i) => semaforoInsumo(i.fecha_costo) === 'rojo');

  const productos = db.prepare('SELECT * FROM productos WHERE activo = 1').all() as Producto[];
  const productosBajoSugerido = productos
    .map((p) => {
      const calc = calcularProducto(p.id);
      return { id: p.id, ...calc };
    })
    .filter((p) => p.precioActual < p.precioSugerido)
    .sort((a, b) => b.diferenciaPesos - a.diferenciaPesos);

  const topInsumos = impactoInsumosEnCarta().slice(0, 5);

  const fechas = insumos
    .map((i) => i.fecha_costo)
    .filter((f): f is string => !!f)
    .sort()
    .reverse();
  const ultimaActualizacion = fechas[0] ?? null;

  res.json({
    insumosDesactualizados: insumosDesactualizados.map((i) => ({ id: i.id, nombre: i.nombre })),
    cantidadInsumosDesactualizados: insumosDesactualizados.length,
    productosBajoSugerido,
    topInsumos,
    ultimaActualizacion,
  });
});
