import { Router } from 'express';
import { db } from '../db.js';
import { calcularReceta } from '../calc.js';
import type { Receta } from '../../shared/types.js';

export const recetasRouter = Router();

interface IngredienteInput {
  tipo: 'insumo' | 'preparacion';
  referencia_id: number;
  cantidad: number;
  unidad: string;
}

interface RecetaInput {
  nombre: string;
  clasificacion: string;
  notas: string | null;
  rendimiento: number;
  rendimiento_unidad: string;
  ingredientes: IngredienteInput[];
}

recetasRouter.get('/', (req, res) => {
  const recetas = db.prepare('SELECT * FROM recetas ORDER BY nombre COLLATE NOCASE').all() as Receta[];
  const resultado = recetas.map((r) => {
    const calc = calcularReceta(r.id);
    return { ...r, costoPorUnidad: calc.costoPorUnidad, desactualizado: calc.desactualizado };
  });
  res.json(resultado);
});

recetasRouter.get('/:id', (req, res) => {
  const receta = db.prepare('SELECT * FROM recetas WHERE id = ?').get(req.params.id) as
    | Receta
    | undefined;
  if (!receta) return res.status(404).json({ error: 'No encontrada' });
  res.json({ ...receta, calculo: calcularReceta(receta.id) });
});

const upsert = db.transaction((id: number | null, body: RecetaInput) => {
  let recetaId: number;
  if (id === null) {
    const info = db
      .prepare(
        `INSERT INTO recetas (nombre, clasificacion, notas, rendimiento, rendimiento_unidad)
         VALUES (@nombre, @clasificacion, @notas, @rendimiento, @rendimiento_unidad)`
      )
      .run(body);
    recetaId = Number(info.lastInsertRowid);
  } else {
    db.prepare(
      `UPDATE recetas SET nombre=@nombre, clasificacion=@clasificacion, notas=@notas,
       rendimiento=@rendimiento, rendimiento_unidad=@rendimiento_unidad WHERE id=@id`
    ).run({ ...body, id });
    recetaId = id;
    db.prepare('DELETE FROM receta_ingredientes WHERE receta_id = ?').run(recetaId);
  }
  const insertIngrediente = db.prepare(
    `INSERT INTO receta_ingredientes (receta_id, tipo, referencia_id, cantidad, unidad, orden)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  body.ingredientes.forEach((i, idx) => {
    insertIngrediente.run(recetaId, i.tipo, i.referencia_id, i.cantidad, i.unidad, idx);
  });
  return recetaId;
});

recetasRouter.post('/', (req, res) => {
  try {
    const id = upsert(null, req.body as RecetaInput);
    res.status(201).json(calcularReceta(id));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

recetasRouter.put('/:id', (req, res) => {
  try {
    const id = upsert(Number(req.params.id), req.body as RecetaInput);
    res.json(calcularReceta(id));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

recetasRouter.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM recetas WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrada' });
  res.status(204).end();
});
