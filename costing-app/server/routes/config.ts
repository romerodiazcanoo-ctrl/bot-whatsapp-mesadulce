import { Router } from 'express';
import { db, setConfig } from '../db.js';

export const configRouter = Router();

configRouter.get('/', (_req, res) => {
  const rows = db.prepare('SELECT clave, valor FROM config').all() as Array<{
    clave: string;
    valor: string;
  }>;
  const obj: Record<string, string> = {};
  for (const r of rows) obj[r.clave] = r.valor;
  res.json(obj);
});

configRouter.put('/', (req, res) => {
  const body = req.body as Record<string, string>;
  for (const [clave, valor] of Object.entries(body)) {
    setConfig(clave, String(valor));
  }
  const rows = db.prepare('SELECT clave, valor FROM config').all() as Array<{
    clave: string;
    valor: string;
  }>;
  const obj: Record<string, string> = {};
  for (const r of rows) obj[r.clave] = r.valor;
  res.json(obj);
});
