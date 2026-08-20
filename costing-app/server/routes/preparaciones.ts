import { Router } from 'express';
import { db } from '../db.js';
import { calcularPreparacion, CircularRefError } from '../calc.js';
import type { Preparacion } from '../../shared/types.js';

export const preparacionesRouter = Router();

interface ComponenteInput {
  tipo: 'insumo' | 'preparacion';
  referencia_id: number;
  cantidad: number;
  unidad: string;
}

interface PreparacionInput {
  nombre: string;
  descripcion: string | null;
  notas: string | null;
  rinde_cantidad: number;
  rinde_unidad: string;
  componentes: ComponenteInput[];
}

preparacionesRouter.get('/', (req, res) => {
  const preparaciones = db
    .prepare('SELECT * FROM preparaciones ORDER BY nombre COLLATE NOCASE')
    .all() as Preparacion[];
  const resultado = preparaciones.map((p) => {
    try {
      const calc = calcularPreparacion(p.id);
      return { ...p, costoPorUnidad: calc.costoPorUnidad, desactualizado: calc.desactualizado, error: null };
    } catch (err) {
      return { ...p, costoPorUnidad: 0, desactualizado: false, error: (err as Error).message };
    }
  });
  res.json(resultado);
});

preparacionesRouter.get('/:id', (req, res) => {
  const prep = db.prepare('SELECT * FROM preparaciones WHERE id = ?').get(req.params.id) as
    | Preparacion
    | undefined;
  if (!prep) return res.status(404).json({ error: 'No encontrada' });
  try {
    const calc = calcularPreparacion(prep.id);
    res.json({ ...prep, calculo: calc });
  } catch (err) {
    if (err instanceof CircularRefError) return res.status(409).json({ error: err.message });
    throw err;
  }
});

const upsert = db.transaction((id: number | null, body: PreparacionInput) => {
  let preparacionId: number;
  if (id === null) {
    const info = db
      .prepare(
        `INSERT INTO preparaciones (nombre, descripcion, notas, rinde_cantidad, rinde_unidad)
         VALUES (@nombre, @descripcion, @notas, @rinde_cantidad, @rinde_unidad)`
      )
      .run(body);
    preparacionId = Number(info.lastInsertRowid);
  } else {
    db.prepare(
      `UPDATE preparaciones SET nombre=@nombre, descripcion=@descripcion, notas=@notas,
       rinde_cantidad=@rinde_cantidad, rinde_unidad=@rinde_unidad WHERE id=@id`
    ).run({ ...body, id });
    preparacionId = id;
    db.prepare('DELETE FROM preparacion_componentes WHERE preparacion_id = ?').run(preparacionId);
  }
  const insertComponente = db.prepare(
    `INSERT INTO preparacion_componentes (preparacion_id, tipo, referencia_id, cantidad, unidad, orden)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  body.componentes.forEach((c, idx) => {
    insertComponente.run(preparacionId, c.tipo, c.referencia_id, c.cantidad, c.unidad, idx);
  });
  // Validar que no haya quedado una referencia circular antes de confirmar.
  // Si calcularPreparacion tira CircularRefError, la transacción se revierte sola.
  calcularPreparacion(preparacionId);
  return preparacionId;
});

preparacionesRouter.post('/', (req, res) => {
  try {
    const id = upsert(null, req.body as PreparacionInput);
    res.status(201).json(calcularPreparacion(id));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

preparacionesRouter.put('/:id', (req, res) => {
  try {
    const id = upsert(Number(req.params.id), req.body as PreparacionInput);
    res.json(calcularPreparacion(id));
  } catch (err) {
    if (err instanceof CircularRefError) return res.status(409).json({ error: err.message });
    res.status(400).json({ error: (err as Error).message });
  }
});

preparacionesRouter.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM preparaciones WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrada' });
  res.status(204).end();
});
