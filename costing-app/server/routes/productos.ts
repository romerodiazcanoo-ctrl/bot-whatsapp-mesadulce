import { Router } from 'express';
import { db } from '../db.js';
import { calcularProducto } from '../calc.js';
import type { Producto } from '../../shared/types.js';

export const productosRouter = Router();

interface RecetaItemInput {
  receta_id: number;
  cantidad: number;
}

interface ProductoInput {
  nombre: string;
  tipo: 'individual' | 'combo';
  packaging_armado_id: number | null;
  precio_actual: number;
  margen_objetivo: number | null;
  activo?: 0 | 1;
  recetas: RecetaItemInput[];
}

productosRouter.get('/', (req, res) => {
  const productos = db
    .prepare('SELECT * FROM productos ORDER BY tipo DESC, nombre COLLATE NOCASE')
    .all() as Producto[];
  res.json(productos.map((p) => ({ ...p, calculo: calcularProducto(p.id) })));
});

productosRouter.get('/:id', (req, res) => {
  const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(req.params.id) as
    | Producto
    | undefined;
  if (!producto) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ...producto, calculo: calcularProducto(producto.id) });
});

const upsert = db.transaction((id: number | null, body: ProductoInput) => {
  let productoId: number;
  if (id === null) {
    const info = db
      .prepare(
        `INSERT INTO productos (nombre, tipo, packaging_armado_id, precio_actual, margen_objetivo, activo)
         VALUES (@nombre, @tipo, @packaging_armado_id, @precio_actual, @margen_objetivo, @activo)`
      )
      .run({ ...body, activo: body.activo ?? 1 });
    productoId = Number(info.lastInsertRowid);
  } else {
    db.prepare(
      `UPDATE productos SET nombre=@nombre, tipo=@tipo, packaging_armado_id=@packaging_armado_id,
       precio_actual=@precio_actual, margen_objetivo=@margen_objetivo, activo=@activo WHERE id=@id`
    ).run({ ...body, id, activo: body.activo ?? 1 });
    productoId = id;
    db.prepare('DELETE FROM producto_recetas WHERE producto_id = ?').run(productoId);
  }
  const insertReceta = db.prepare(
    'INSERT INTO producto_recetas (producto_id, receta_id, cantidad) VALUES (?, ?, ?)'
  );
  body.recetas.forEach((r) => {
    insertReceta.run(productoId, r.receta_id, r.cantidad);
  });
  return productoId;
});

productosRouter.post('/', (req, res) => {
  try {
    const id = upsert(null, req.body as ProductoInput);
    res.status(201).json(calcularProducto(id));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

productosRouter.put('/:id', (req, res) => {
  try {
    const id = upsert(Number(req.params.id), req.body as ProductoInput);
    res.json(calcularProducto(id));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

productosRouter.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM productos WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrado' });
  res.status(204).end();
});
