import { Router } from 'express';
import { db } from '../db.js';
import { calcularPackaging } from '../calc.js';
import type { PackagingArmado, PackagingComponente } from '../../shared/types.js';

export const packagingRouter = Router();

interface ComponenteInput {
  insumo_id: number;
  cantidad: number;
  unidad: string;
}

interface ArmadoInput {
  nombre: string;
  componentes: ComponenteInput[];
}

packagingRouter.get('/', (req, res) => {
  const armados = db
    .prepare('SELECT * FROM packaging_armados ORDER BY nombre COLLATE NOCASE')
    .all() as PackagingArmado[];
  res.json(armados.map((a) => ({ ...a, costoTotal: calcularPackaging(a.id) })));
});

packagingRouter.get('/:id', (req, res) => {
  const armado = db.prepare('SELECT * FROM packaging_armados WHERE id = ?').get(req.params.id) as
    | PackagingArmado
    | undefined;
  if (!armado) return res.status(404).json({ error: 'No encontrado' });
  const componentes = db
    .prepare('SELECT * FROM packaging_componentes WHERE armado_id = ?')
    .all(armado.id) as PackagingComponente[];
  res.json({ ...armado, componentes, costoTotal: calcularPackaging(armado.id) });
});

const upsert = db.transaction((id: number | null, body: ArmadoInput) => {
  let armadoId: number;
  if (id === null) {
    const info = db.prepare('INSERT INTO packaging_armados (nombre) VALUES (?)').run(body.nombre);
    armadoId = Number(info.lastInsertRowid);
  } else {
    db.prepare('UPDATE packaging_armados SET nombre = ? WHERE id = ?').run(body.nombre, id);
    armadoId = id;
    db.prepare('DELETE FROM packaging_componentes WHERE armado_id = ?').run(armadoId);
  }
  const insertComponente = db.prepare(
    'INSERT INTO packaging_componentes (armado_id, insumo_id, cantidad, unidad) VALUES (?, ?, ?, ?)'
  );
  body.componentes.forEach((c) => {
    insertComponente.run(armadoId, c.insumo_id, c.cantidad, c.unidad);
  });
  return armadoId;
});

packagingRouter.post('/', (req, res) => {
  try {
    const id = upsert(null, req.body as ArmadoInput);
    res.status(201).json({ id, costoTotal: calcularPackaging(id) });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

packagingRouter.put('/:id', (req, res) => {
  try {
    const id = upsert(Number(req.params.id), req.body as ArmadoInput);
    res.json({ id, costoTotal: calcularPackaging(id) });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

packagingRouter.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM packaging_armados WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrado' });
  res.status(204).end();
});
