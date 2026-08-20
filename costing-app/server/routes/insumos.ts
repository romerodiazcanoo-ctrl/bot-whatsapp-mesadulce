import { Router } from 'express';
import { db } from '../db.js';
import { insumoCostoUnitario, semaforoInsumo, diasDesdeActualizacion } from '../calc.js';
import { unidadBaseDe, aCantidadBase, costoLegible } from '../../shared/units.js';
import type { Insumo } from '../../shared/types.js';

export const insumosRouter = Router();

function conCalculo(insumo: Insumo) {
  const costoUnitario = insumoCostoUnitario(insumo);
  const legible = costoLegible(costoUnitario * insumo.cantidad_por_compra, insumo.cantidad_por_compra, insumo.unidad_base);
  return {
    ...insumo,
    costoUnitario,
    costoLegible: legible.costoLegibleValor,
    unidadLegible: legible.unidadLegible,
    semaforo: semaforoInsumo(insumo.fecha_costo),
    diasDesdeActualizacion: diasDesdeActualizacion(insumo.fecha_costo),
  };
}

insumosRouter.get('/', (req, res) => {
  const { categoria, activos } = req.query;
  let query = 'SELECT * FROM insumos WHERE 1=1';
  const params: unknown[] = [];
  if (categoria) {
    query += ' AND categoria = ?';
    params.push(categoria);
  }
  if (activos === 'true') {
    query += ' AND activo = 1';
  }
  query += ' ORDER BY nombre COLLATE NOCASE';
  const insumos = db.prepare(query).all(...params) as Insumo[];
  res.json(insumos.map(conCalculo));
});

insumosRouter.get('/:id', (req, res) => {
  const insumo = db.prepare('SELECT * FROM insumos WHERE id = ?').get(req.params.id) as
    | Insumo
    | undefined;
  if (!insumo) return res.status(404).json({ error: 'No encontrado' });
  res.json(conCalculo(insumo));
});

interface InsumoInput {
  nombre: string;
  categoria: 'materia_prima' | 'packaging' | 'otro';
  unidad_compra: string;
  cantidad_compra_ingresada: number; // cantidad en la unidad de compra tal cual la escribe el usuario
  costo_compra: number;
  fecha_costo: string | null;
  proveedor: string | null;
  activo?: 0 | 1;
}

function normalizar(body: InsumoInput) {
  const unidad_base = unidadBaseDe(body.unidad_compra);
  const cantidad_por_compra = aCantidadBase(body.unidad_compra, body.cantidad_compra_ingresada);
  return { unidad_base, cantidad_por_compra };
}

insumosRouter.post('/', (req, res) => {
  const body = req.body as InsumoInput;
  try {
    const { unidad_base, cantidad_por_compra } = normalizar(body);
    const info = db
      .prepare(
        `INSERT INTO insumos (nombre, categoria, unidad_base, unidad_compra, cantidad_por_compra, costo_compra, fecha_costo, proveedor, activo)
         VALUES (@nombre, @categoria, @unidad_base, @unidad_compra, @cantidad_por_compra, @costo_compra, @fecha_costo, @proveedor, @activo)`
      )
      .run({
        nombre: body.nombre,
        categoria: body.categoria,
        unidad_base,
        unidad_compra: body.unidad_compra,
        cantidad_por_compra,
        costo_compra: body.costo_compra,
        fecha_costo: body.fecha_costo,
        proveedor: body.proveedor ?? null,
        activo: body.activo ?? 1,
      });
    const insumo = db.prepare('SELECT * FROM insumos WHERE id = ?').get(info.lastInsertRowid) as Insumo;
    res.status(201).json(conCalculo(insumo));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

insumosRouter.put('/:id', (req, res) => {
  const body = req.body as InsumoInput;
  try {
    const { unidad_base, cantidad_por_compra } = normalizar(body);
    const info = db
      .prepare(
        `UPDATE insumos SET nombre=@nombre, categoria=@categoria, unidad_base=@unidad_base,
         unidad_compra=@unidad_compra, cantidad_por_compra=@cantidad_por_compra, costo_compra=@costo_compra,
         fecha_costo=@fecha_costo, proveedor=@proveedor, activo=@activo WHERE id=@id`
      )
      .run({
        id: Number(req.params.id),
        nombre: body.nombre,
        categoria: body.categoria,
        unidad_base,
        unidad_compra: body.unidad_compra,
        cantidad_por_compra,
        costo_compra: body.costo_compra,
        fecha_costo: body.fecha_costo,
        proveedor: body.proveedor ?? null,
        activo: body.activo ?? 1,
      });
    if (info.changes === 0) return res.status(404).json({ error: 'No encontrado' });
    const insumo = db.prepare('SELECT * FROM insumos WHERE id = ?').get(req.params.id) as Insumo;
    res.json(conCalculo(insumo));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Actualización rápida de costo: usada por la vista de "actualización rápida" del dashboard de insumos.
insumosRouter.patch('/:id/costo', (req, res) => {
  const { costo_compra, fecha_costo } = req.body as { costo_compra: number; fecha_costo?: string };
  const fecha = fecha_costo ?? new Date().toISOString().slice(0, 10);
  const info = db
    .prepare('UPDATE insumos SET costo_compra = ?, fecha_costo = ? WHERE id = ?')
    .run(costo_compra, fecha, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrado' });
  const insumo = db.prepare('SELECT * FROM insumos WHERE id = ?').get(req.params.id) as Insumo;
  res.json(conCalculo(insumo));
});

insumosRouter.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM insumos WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrado' });
  res.status(204).end();
});
