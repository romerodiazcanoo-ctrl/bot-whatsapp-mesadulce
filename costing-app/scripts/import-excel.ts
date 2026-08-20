/**
 * Importa Costeo_carta_MD.xlsx a mesadulce.db.
 * Pensado para correrse UNA vez sobre una base vacía (borra y recrea las tablas de datos).
 *
 * Reglas de negocio acordadas con el usuario antes de programar:
 * - "Brownie clasico" y "Cookie chip adorno" NO se cargan como insumos (son productos
 *   cargados a mano en la planilla maestra por error) — se excluyen y quedan en el reporte.
 * - Las 16 recetas usan siempre insumos crudos (ninguna referencia a una preparación
 *   del Anexo 1 todavía) — se importan tal cual están, sin "arreglar" el bug #5.
 * - "5) Costo total" es la fuente de verdad para composición y precio actual de productos
 *   (confirmado por el usuario). Las diferencias contra la pivot "finales" se listan al final.
 * - "Cookie rellena x1" se carga como un producto independiente por sabor.
 * - "Combo rellenas x6" no está en "5) Costo total"; se sintetiza como el doble de
 *   "Combo rellenas x3" con precio $22.000 tomado de la pivot "finales" (confirmado).
 */
import XLSX from 'xlsx';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../server/db.js';
import { aCantidadBase, unidadBaseDe } from '../shared/units.js';
import { calcularReceta } from '../server/calc.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXCEL_PATH = path.join(__dirname, '..', 'Costeo_carta_MD.xlsx');

const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });

function sheet(name: string) {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`No se encontró la hoja "${name}"`);
  return ws;
}

function cell(ws: XLSX.WorkSheet, addr: string) {
  return ws[addr]?.v;
}

function rowsFrom(ws: XLSX.WorkSheet, startRow: number, endRow: number) {
  const rows: number[] = [];
  for (let r = startRow; r <= endRow; r++) rows.push(r);
  return rows;
}

// ---------------------------------------------------------------------------
// Reporte acumulado
// ---------------------------------------------------------------------------
const reporte = {
  insumosExcluidos: [] as string[],
  supuestos: [] as string[],
  diferenciasPrecio: [] as string[],
  verificacionRecetas: [] as string[],
};

// ---------------------------------------------------------------------------
// Limpieza (import pensado para correr sobre una base vacía / re-importar)
// ---------------------------------------------------------------------------
db.exec(`
  DELETE FROM producto_recetas;
  DELETE FROM productos;
  DELETE FROM packaging_componentes;
  DELETE FROM packaging_armados;
  DELETE FROM receta_ingredientes;
  DELETE FROM recetas;
  DELETE FROM preparacion_componentes;
  DELETE FROM preparaciones;
  DELETE FROM insumos;
`);

// ---------------------------------------------------------------------------
// 1) Insumos — "1) Planilla maestra insumos"
// ---------------------------------------------------------------------------
const PACKAGING_INSUMOS = new Set([
  'Caja chica',
  'Caja grande',
  'Caja para huevos',
  'Cucharas',
  'Papel parafinado',
  'Stickers',
]);
const EXCLUIDOS = new Set(['Brownie clasico', 'Cookie chip adorno']);

const insumoIdPorNombre = new Map<string, number>();
const unidadCompraPorInsumo = new Map<string, string>();
// El Excel original usa VLOOKUP, que en Excel es case-insensitive (ej. "4) Packaging"
// referencia "caja chica" en minúsculas mientras el insumo maestro es "Caja chica").
// Replicamos ese comportamiento acá para no perder esas filas silenciosamente.
const insumoIdPorNombreNormalizado = new Map<string, number>();
const unidadCompraPorInsumoNormalizado = new Map<string, string>();

function buscarInsumoId(nombre: string): number | undefined {
  return insumoIdPorNombre.get(nombre) ?? insumoIdPorNombreNormalizado.get(nombre.trim().toLowerCase());
}

function buscarUnidadCompra(nombre: string): string {
  return (
    unidadCompraPorInsumo.get(nombre) ??
    unidadCompraPorInsumoNormalizado.get(nombre.trim().toLowerCase()) ??
    'unidad'
  );
}

const insertInsumo = db.prepare(`
  INSERT INTO insumos (nombre, categoria, unidad_base, unidad_compra, cantidad_por_compra, costo_compra, fecha_costo, proveedor, activo)
  VALUES (@nombre, @categoria, @unidad_base, @unidad_compra, @cantidad_por_compra, @costo_compra, @fecha_costo, @proveedor, 1)
`);

{
  const ws = sheet('1) Planilla maestra insumos');
  let cargados = 0;
  for (const r of rowsFrom(ws, 3, 42)) {
    const nombre = cell(ws, `B${r}`);
    if (!nombre) continue;
    if (EXCLUIDOS.has(nombre)) {
      reporte.insumosExcluidos.push(
        `${nombre}: no se carga como insumo (es un producto de reventa/receta cargado a mano). No se usa en ninguna receta actual.`
      );
      continue;
    }
    const unidadCompra = String(cell(ws, `C${r}`));
    const cantidadIngresada = Number(cell(ws, `D${r}`));
    const costoCompra = Number(cell(ws, `E${r}`));
    const fechaRaw = cell(ws, `G${r}`);
    const fecha = fechaRaw instanceof Date ? fechaRaw.toISOString().slice(0, 10) : null;

    unidadCompraPorInsumo.set(nombre, unidadCompra);
    unidadCompraPorInsumoNormalizado.set(nombre.trim().toLowerCase(), unidadCompra);
    const info = insertInsumo.run({
      nombre,
      categoria: PACKAGING_INSUMOS.has(nombre) ? 'packaging' : 'materia_prima',
      unidad_base: unidadBaseDe(unidadCompra),
      unidad_compra: unidadCompra,
      cantidad_por_compra: aCantidadBase(unidadCompra, cantidadIngresada),
      costo_compra: costoCompra,
      fecha_costo: fecha,
      proveedor: null,
    });
    const insumoId = Number(info.lastInsertRowid);
    insumoIdPorNombre.set(nombre, insumoId);
    insumoIdPorNombreNormalizado.set(nombre.trim().toLowerCase(), insumoId);
    cargados++;
  }
  console.log(`✔ Insumos cargados: ${cargados} (excluidos: ${reporte.insumosExcluidos.length})`);
}

// ---------------------------------------------------------------------------
// 2) Preparaciones — "Anexo 1"
// ---------------------------------------------------------------------------
const preparacionIdPorNombre = new Map<string, number>();

const insertPrep = db.prepare(`
  INSERT INTO preparaciones (nombre, descripcion, notas, rinde_cantidad, rinde_unidad)
  VALUES (@nombre, @descripcion, @notas, @rinde_cantidad, @rinde_unidad)
`);
const insertPrepComponente = db.prepare(`
  INSERT INTO preparacion_componentes (preparacion_id, tipo, referencia_id, cantidad, unidad, orden)
  VALUES (?, 'insumo', ?, ?, ?, ?)
`);

function resolverInsumoConSinonimo(nombreExcel: string): number | null {
  const directo = buscarInsumoId(nombreExcel);
  if (directo !== undefined) return directo;
  const SINONIMOS: Record<string, string> = {
    'azucar impalpable': 'Azucar glass',
  };
  const alt = SINONIMOS[nombreExcel.trim().toLowerCase()];
  const idAlt = alt ? buscarInsumoId(alt) : undefined;
  if (idAlt !== undefined) {
    reporte.supuestos.push(
      `Anexo 1 usa "${nombreExcel}", que no existe como insumo — se asumió que es "${alt}".`
    );
    return idAlt;
  }
  return null;
}

{
  const ws = sheet('Anexo 1');

  function crearPreparacionConIngredientes(
    nombre: string,
    filas: Array<{ insumoExcel: string; unidad: string; cantidad: number }>,
    rindeCantidad: number,
    rindeUnidad: string
  ) {
    const info = insertPrep.run({
      nombre,
      descripcion: null,
      notas: null,
      rinde_cantidad: rindeCantidad,
      rinde_unidad: rindeUnidad,
    });
    const prepId = Number(info.lastInsertRowid);
    preparacionIdPorNombre.set(nombre, prepId);
    filas.forEach((f, idx) => {
      const insumoId = resolverInsumoConSinonimo(f.insumoExcel);
      if (insumoId === null) {
        reporte.supuestos.push(
          `Preparación "${nombre}": no se encontró el insumo "${f.insumoExcel}", ingrediente omitido.`
        );
        return;
      }
      insertPrepComponente.run(prepId, insumoId, f.cantidad, f.unidad, idx);
    });
  }

  // Reducción de frutos rojos (filas 12-14, rinde en I15)
  crearPreparacionConIngredientes(
    'Reduccion frutos rojos',
    [
      { insumoExcel: String(cell(ws, 'G12')), unidad: String(cell(ws, 'H12')), cantidad: Number(cell(ws, 'I12')) },
      { insumoExcel: String(cell(ws, 'G13')), unidad: String(cell(ws, 'H13')), cantidad: Number(cell(ws, 'I13')) },
      { insumoExcel: String(cell(ws, 'G14')), unidad: String(cell(ws, 'H14')), cantidad: Number(cell(ws, 'I14')) },
    ],
    Number(cell(ws, 'I15')),
    'kg'
  );

  // Crema chantilly (filas 20-21, rinde en I22)
  crearPreparacionConIngredientes(
    'Crema chantilly',
    [
      { insumoExcel: String(cell(ws, 'G20')), unidad: String(cell(ws, 'H20')), cantidad: Number(cell(ws, 'I20')) },
      { insumoExcel: String(cell(ws, 'G21')), unidad: String(cell(ws, 'H21')), cantidad: Number(cell(ws, 'I21')) },
    ],
    Number(cell(ws, 'I22')),
    'gr'
  );

  // Preparaciones vacías, a completar por el usuario.
  for (const nombre of ['Ganache de chocolate negro', 'Ganache de chocolate blanco', 'Frosting de queso crema']) {
    const info = insertPrep.run({
      nombre,
      descripcion: 'Cargada vacía desde el Excel — completar ingredientes.',
      notas: null,
      rinde_cantidad: 0,
      rinde_unidad: 'g',
    });
    preparacionIdPorNombre.set(nombre, Number(info.lastInsertRowid));
    reporte.supuestos.push(`Preparación "${nombre}" creada vacía — falta cargar ingredientes y rendimiento.`);
  }

  console.log(`✔ Preparaciones cargadas: ${preparacionIdPorNombre.size} (2 con ingredientes, 3 vacías)`);
}

// ---------------------------------------------------------------------------
// 3) Recetas — "2) Recetas"
// ---------------------------------------------------------------------------
interface FilaReceta {
  receta: string;
  clasificacion: string;
  insumo: string;
  unidad: string;
  cantidadReceta: number;
  cantidadObtenida: number;
}

const recetaIdPorNombre = new Map<string, number>();

const insertReceta = db.prepare(`
  INSERT INTO recetas (nombre, clasificacion, notas, rendimiento, rendimiento_unidad)
  VALUES (@nombre, @clasificacion, NULL, @rendimiento, 'unidad')
`);
const insertRecetaIngrediente = db.prepare(`
  INSERT INTO receta_ingredientes (receta_id, tipo, referencia_id, cantidad, unidad, orden)
  VALUES (?, 'insumo', ?, ?, ?, ?)
`);

{
  const ws = sheet('2) Recetas');
  const filasPorReceta = new Map<string, FilaReceta[]>();

  for (const r of rowsFrom(ws, 3, 991)) {
    const nombreReceta = cell(ws, `B${r}`);
    if (!nombreReceta) continue;
    const fila: FilaReceta = {
      receta: nombreReceta,
      clasificacion: String(cell(ws, `C${r}`) ?? ''),
      insumo: String(cell(ws, `D${r}`)),
      unidad: buscarUnidadCompra(String(cell(ws, `D${r}`))),
      cantidadReceta: Number(cell(ws, `F${r}`)),
      cantidadObtenida: Number(cell(ws, `G${r}`)),
    };
    if (!filasPorReceta.has(nombreReceta)) filasPorReceta.set(nombreReceta, []);
    filasPorReceta.get(nombreReceta)!.push(fila);
  }

  for (const [nombreReceta, filas] of filasPorReceta) {
    const rendimientoFinal = Math.max(...filas.map((f) => f.cantidadObtenida));
    const gruposDistintos = new Set(filas.map((f) => f.cantidadObtenida));
    if (gruposDistintos.size > 1) {
      reporte.supuestos.push(
        `Receta "${nombreReceta}": tiene sub-lotes con rendimientos distintos en el Excel (${[...gruposDistintos].join(
          ', '
        )}). Se tomó ${rendimientoFinal} como rendimiento final y se re-escalaron las cantidades de cada ingrediente proporcionalmente — el costo por unidad da idéntico, pero revisá que las cantidades del lote tengan sentido para tu producción real.`
      );
    }

    const info = insertReceta.run({
      nombre: nombreReceta,
      clasificacion: filas[0].clasificacion,
      rendimiento: rendimientoFinal,
    });
    const recetaId = Number(info.lastInsertRowid);
    recetaIdPorNombre.set(nombreReceta, recetaId);

    filas.forEach((f, idx) => {
      const insumoId = buscarInsumoId(f.insumo);
      if (insumoId === undefined) {
        reporte.supuestos.push(`Receta "${nombreReceta}": ingrediente "${f.insumo}" no encontrado, omitido.`);
        return;
      }
      const cantidadPorUnidadFinal = f.cantidadReceta / f.cantidadObtenida;
      const cantidadNormalizada = cantidadPorUnidadFinal * rendimientoFinal;
      insertRecetaIngrediente.run(recetaId, insumoId, cantidadNormalizada, f.unidad, idx);
    });
  }
  console.log(`✔ Recetas cargadas: ${recetaIdPorNombre.size}`);
}

// ---------------------------------------------------------------------------
// 4) Packaging — "4) Packaging"
// ---------------------------------------------------------------------------
interface FilaPackaging {
  armado: string;
  insumo: string;
  unidad: string;
  cantidad: number;
}

const armadoIdPorNombre = new Map<string, number>();

const insertArmado = db.prepare('INSERT INTO packaging_armados (nombre) VALUES (?)');
const insertPackagingComponente = db.prepare(
  'INSERT INTO packaging_componentes (armado_id, insumo_id, cantidad, unidad) VALUES (?, ?, ?, ?)'
);

{
  const ws = sheet('4) Packaging');
  let armadoActual = '';
  const filasPorArmado = new Map<string, FilaPackaging[]>();

  for (const r of rowsFrom(ws, 4, 48)) {
    const nombreArmado = cell(ws, `B${r}`);
    if (nombreArmado) armadoActual = nombreArmado;
    const insumo = cell(ws, `C${r}`);
    if (!insumo || !armadoActual) continue;
    const fila: FilaPackaging = {
      armado: armadoActual,
      insumo,
      unidad: buscarUnidadCompra(insumo),
      cantidad: Number(cell(ws, `E${r}`)),
    };
    if (!filasPorArmado.has(armadoActual)) filasPorArmado.set(armadoActual, []);
    filasPorArmado.get(armadoActual)!.push(fila);
  }

  function crearArmado(nombre: string, filas: FilaPackaging[]) {
    const info = insertArmado.run(nombre);
    const armadoId = Number(info.lastInsertRowid);
    armadoIdPorNombre.set(nombre, armadoId);
    for (const f of filas) {
      const insumoId = buscarInsumoId(f.insumo);
      if (insumoId === undefined) {
        reporte.supuestos.push(`Packaging "${nombre}": insumo "${f.insumo}" no encontrado, omitido.`);
        continue;
      }
      insertPackagingComponente.run(armadoId, insumoId, f.cantidad, f.unidad);
    }
    return armadoId;
  }

  for (const [nombre, filas] of filasPorArmado) {
    crearArmado(nombre, filas);
  }

  // "Combo rellenas x6" no tiene armado propio en la hoja fuente: se sintetiza
  // como el doble de "Combo rellenas x3" (confirmado con el usuario).
  const filasX3 = filasPorArmado.get('Combo rellenas x3');
  if (filasX3) {
    crearArmado(
      'Combo rellenas x6',
      filasX3.map((f) => ({ ...f, cantidad: f.cantidad * 2 }))
    );
    reporte.supuestos.push(
      'Packaging "Combo rellenas x6" no existía en la hoja fuente — se creó como el doble de "Combo rellenas x3".'
    );
  }

  console.log(`✔ Armados de packaging cargados: ${armadoIdPorNombre.size}`);
}

// ---------------------------------------------------------------------------
// 5) Productos — "5) Costo total" (fuente de verdad) + flavor-split para
//    "Cookie rellena x1" + síntesis de "Combo rellenas x6"
// ---------------------------------------------------------------------------
interface FilaProducto {
  producto: string;
  receta: string;
  cantidad: number;
  precioActual: number | null;
}

const insertProducto = db.prepare(`
  INSERT INTO productos (nombre, tipo, packaging_armado_id, precio_actual, margen_objetivo, activo)
  VALUES (@nombre, @tipo, @packaging_armado_id, @precio_actual, NULL, 1)
`);
const insertProductoReceta = db.prepare(
  'INSERT INTO producto_recetas (producto_id, receta_id, cantidad) VALUES (?, ?, ?)'
);

const PRODUCTOS_CON_SABOR = new Set(['Cookie rellena x1', 'brownie  x1', 'Cookie clasica x1']);

// Precio de respaldo para combos que en "5) Costo total" no tienen ninguna fila
// con precio cargado (la columna J quedó vacía en todo el bloque). Se toma de la
// pivot "finales" únicamente quesa ausencia, no cuando ambas hojas ya coinciden o
// difieren (eso se reporta aparte).
const precioDeRespaldoPorNombre = new Map<string, number>();
{
  const ws = sheet('finales');
  for (const r of rowsFrom(ws, 4, 24)) {
    const nombre = cell(ws, `B${r}`);
    const precio = cell(ws, `F${r}`);
    if (nombre && typeof precio === 'number') precioDeRespaldoPorNombre.set(nombre, precio);
  }
}

{
  const ws = sheet('5) Costo total');
  // Regla de corte de bloque: la columna B repite el nombre del producto en
  // TODAS sus filas (no solo en la primera), así que un bloque nuevo empieza
  // cuando B cambia respecto de la fila anterior. Única excepción: los
  // productos con sabor (Cookie rellena x1, Cookie clasica x1, brownie x1)
  // repiten el mismo nombre en filas consecutivas pero cada fila es un
  // producto distinto — ahí cada fila abre su propio bloque.
  let productoActual = '';
  const bloques: FilaProducto[][] = [];
  let bloqueActual: FilaProducto[] = [];

  for (const r of rowsFrom(ws, 3, 62)) {
    const nombreProducto = cell(ws, `B${r}`);
    const receta = cell(ws, `C${r}`);
    if (!receta) continue;
    const filaProductoUnico = nombreProducto && PRODUCTOS_CON_SABOR.has(nombreProducto);
    const cambiaDeBloque = nombreProducto && (nombreProducto !== productoActual || filaProductoUnico);
    if (cambiaDeBloque) {
      if (bloqueActual.length) bloques.push(bloqueActual);
      bloqueActual = [];
      productoActual = nombreProducto;
    }
    bloqueActual.push({
      producto: productoActual,
      receta,
      cantidad: Number(cell(ws, `E${r}`)),
      precioActual: typeof cell(ws, `J${r}`) === 'number' ? Number(cell(ws, `J${r}`)) : null,
    });
  }
  if (bloqueActual.length) bloques.push(bloqueActual);

  let creados = 0;
  for (const bloque of bloques) {
    const nombreBase = bloque[0].producto;
    const precioEnFuente = bloque.find((f) => f.precioActual !== null)?.precioActual ?? null;
    let precio = precioEnFuente ?? 0;
    if (precioEnFuente === null) {
      const respaldo = precioDeRespaldoPorNombre.get(nombreBase);
      if (respaldo !== undefined) {
        precio = respaldo;
        reporte.supuestos.push(
          `Producto "${nombreBase}": no tenía precio cargado en "5) Costo total" — se usó $${respaldo.toLocaleString(
            'es-AR'
          )} de la pivot "finales" como único dato disponible.`
        );
      } else {
        reporte.supuestos.push(`Producto "${nombreBase}": sin precio actual en ninguna hoja — quedó en $0, cargalo a mano.`);
      }
    }
    const esCombo = nombreBase.toLowerCase().startsWith('combo');

    let nombreProducto = nombreBase;
    if (PRODUCTOS_CON_SABOR.has(nombreBase)) {
      // Cada bloque de "Cookie rellena x1" es un solo sabor (una sola receta) — usarlo como variante.
      const saborBase = bloque[0].receta;
      nombreProducto = `${nombreBase.trim()} - ${saborBase}`;
    }

    const packagingId = armadoIdPorNombre.get(nombreBase) ?? null;
    const info = insertProducto.run({
      nombre: nombreProducto,
      tipo: esCombo ? 'combo' : 'individual',
      packaging_armado_id: packagingId,
      precio_actual: precio,
    });
    const productoId = Number(info.lastInsertRowid);
    for (const f of bloque) {
      const recetaId = recetaIdPorNombre.get(f.receta);
      if (recetaId === undefined) {
        reporte.supuestos.push(`Producto "${nombreProducto}": receta "${f.receta}" no encontrada, omitida.`);
        continue;
      }
      insertProductoReceta.run(productoId, recetaId, f.cantidad);
    }
    creados++;
  }

  // Combo rellenas x6 = 2x Combo rellenas x3, precio $22.000 (tomado de la pivot "finales", confirmado).
  const bloqueX3 = bloques.find((b) => b[0].producto === 'Combo rellenas x3');
  if (bloqueX3) {
    const info = insertProducto.run({
      nombre: 'Combo rellenas x6',
      tipo: 'combo',
      packaging_armado_id: armadoIdPorNombre.get('Combo rellenas x6') ?? null,
      precio_actual: 22000,
    });
    const productoId = Number(info.lastInsertRowid);
    for (const f of bloqueX3) {
      const recetaId = recetaIdPorNombre.get(f.receta);
      if (recetaId === undefined) continue;
      insertProductoReceta.run(productoId, recetaId, f.cantidad * 2);
    }
    creados++;
    reporte.supuestos.push(
      'Producto "Combo rellenas x6" no estaba en "5) Costo total" — se creó como el doble de "Combo rellenas x3", precio $22.000 tomado de la pivot "finales" (confirmado con el usuario).'
    );
  }

  console.log(`✔ Productos cargados: ${creados}`);
}

// ---------------------------------------------------------------------------
// Reporte: diferencias de precio entre "5) Costo total" y la pivot "finales"
// ---------------------------------------------------------------------------
{
  const wsTotal = sheet('5) Costo total');
  const wsFinales = sheet('finales');

  const precioEnCostoTotal = new Map<string, number>();
  let productoActual = '';
  for (const r of rowsFrom(wsTotal, 3, 62)) {
    const nombreProducto = cell(wsTotal, `B${r}`);
    if (nombreProducto) productoActual = nombreProducto;
    const j = cell(wsTotal, `J${r}`);
    if (typeof j === 'number' && productoActual && !precioEnCostoTotal.has(productoActual)) {
      precioEnCostoTotal.set(productoActual, j);
    }
  }

  for (const r of rowsFrom(wsFinales, 4, 24)) {
    const nombre = cell(wsFinales, `B${r}`);
    const precioPivot = cell(wsFinales, `F${r}`);
    if (!nombre || typeof precioPivot !== 'number') continue;
    const precioFuente = precioEnCostoTotal.get(nombre);
    if (precioFuente !== undefined && precioFuente !== precioPivot) {
      reporte.diferenciasPrecio.push(
        `${nombre}: $${precioFuente.toLocaleString('es-AR')} en "5) Costo total" (usado) vs $${precioPivot.toLocaleString(
          'es-AR'
        )} en la pivot "finales" (no usado, tabla dinámica desactualizada).`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Verificación: costo por unidad de las 16 recetas vs "3) costo mp"
// ---------------------------------------------------------------------------
{
  const ws = sheet('3) costo mp');
  for (const r of rowsFrom(ws, 4, 19)) {
    const nombre = cell(ws, `B${r}`);
    const esperado = cell(ws, `C${r}`);
    if (!nombre || typeof esperado !== 'number') continue;
    const recetaId = recetaIdPorNombre.get(nombre);
    if (recetaId === undefined) {
      reporte.verificacionRecetas.push(`${nombre}: no se pudo verificar (receta no encontrada tras importar).`);
      continue;
    }
    // "3) costo mp" es "suma de costo parcial", es decir costo por UNA unidad final
    // (cada fila del Excel ya viene normalizada a "cantidad unitaria" = F/G).
    const calc = calcularReceta(recetaId);
    const diferencia = calc.costoPorUnidad - esperado;
    if (Math.abs(diferencia) < 0.5) {
      reporte.verificacionRecetas.push(`✔ ${nombre}: $${calc.costoPorUnidad.toFixed(2)} (coincide con "3) costo mp")`);
    } else {
      reporte.verificacionRecetas.push(
        `⚠ ${nombre}: $${calc.costoPorUnidad.toFixed(2)} en vivo vs $${esperado.toFixed(
          2
        )} en la pivot "3) costo mp" (diferencia $${diferencia.toFixed(2)} — la pivot quedó desactualizada respecto al precio actual de algún insumo).`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Reporte final
// ---------------------------------------------------------------------------
console.log('\n========== RESUMEN DE IMPORTACIÓN ==========');
console.log(`Insumos: ${insumoIdPorNombre.size}`);
console.log(`Preparaciones: ${preparacionIdPorNombre.size}`);
console.log(`Recetas: ${recetaIdPorNombre.size}`);
console.log(`Armados de packaging: ${armadoIdPorNombre.size}`);
console.log(`Productos: ${(db.prepare('SELECT COUNT(*) as c FROM productos').get() as { c: number }).c}`);

console.log('\n--- Insumos excluidos ---');
reporte.insumosExcluidos.forEach((l) => console.log('  ' + l));

console.log('\n--- Supuestos y datos no mapeados ---');
reporte.supuestos.forEach((l) => console.log('  ' + l));

console.log('\n--- Diferencias de precio: "5) Costo total" vs pivot "finales" ---');
reporte.diferenciasPrecio.forEach((l) => console.log('  ' + l));

console.log('\n--- Verificación de costo por unidad (16 recetas) vs "3) costo mp" ---');
reporte.verificacionRecetas.forEach((l) => console.log('  ' + l));

console.log('\n✔ Importación terminada.');
