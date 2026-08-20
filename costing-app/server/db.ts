import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'mesadulce.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS insumos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  categoria TEXT NOT NULL CHECK (categoria IN ('materia_prima','packaging','otro')),
  unidad_base TEXT NOT NULL CHECK (unidad_base IN ('g','ml','unidad')),
  unidad_compra TEXT NOT NULL,
  cantidad_por_compra REAL NOT NULL,
  costo_compra REAL NOT NULL,
  fecha_costo TEXT,
  proveedor TEXT,
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS preparaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  notas TEXT,
  rinde_cantidad REAL NOT NULL DEFAULT 0,
  rinde_unidad TEXT NOT NULL DEFAULT 'g'
);

CREATE TABLE IF NOT EXISTS preparacion_componentes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  preparacion_id INTEGER NOT NULL REFERENCES preparaciones(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('insumo','preparacion')),
  referencia_id INTEGER NOT NULL,
  cantidad REAL NOT NULL,
  unidad TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recetas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  clasificacion TEXT NOT NULL DEFAULT '',
  notas TEXT,
  rendimiento REAL NOT NULL DEFAULT 0,
  rendimiento_unidad TEXT NOT NULL DEFAULT 'unidad'
);

CREATE TABLE IF NOT EXISTS receta_ingredientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receta_id INTEGER NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('insumo','preparacion')),
  referencia_id INTEGER NOT NULL,
  cantidad REAL NOT NULL,
  unidad TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS packaging_armados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS packaging_componentes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  armado_id INTEGER NOT NULL REFERENCES packaging_armados(id) ON DELETE CASCADE,
  insumo_id INTEGER NOT NULL REFERENCES insumos(id),
  cantidad REAL NOT NULL,
  unidad TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('individual','combo')),
  packaging_armado_id INTEGER REFERENCES packaging_armados(id),
  precio_actual REAL NOT NULL DEFAULT 0,
  margen_objetivo REAL,
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS producto_recetas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  receta_id INTEGER NOT NULL REFERENCES recetas(id),
  cantidad REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
`);

const defaults: Record<string, string> = {
  margen_objetivo_default: '0.7',
  umbral_dias_amarillo: '15',
  umbral_dias_rojo: '30',
  redondeo_lista_precios: '100',
};

const insertConfig = db.prepare(
  'INSERT OR IGNORE INTO config (clave, valor) VALUES (?, ?)'
);
for (const [clave, valor] of Object.entries(defaults)) {
  insertConfig.run(clave, valor);
}

export function getConfig(clave: string): string | undefined {
  const row = db.prepare('SELECT valor FROM config WHERE clave = ?').get(clave) as
    | { valor: string }
    | undefined;
  return row?.valor;
}

export function setConfig(clave: string, valor: string) {
  db.prepare(
    'INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor'
  ).run(clave, valor);
}
