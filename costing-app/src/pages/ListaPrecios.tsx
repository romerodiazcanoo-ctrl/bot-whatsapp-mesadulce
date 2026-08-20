import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';
import type { ConfigDTO, ProductoDTO } from '../lib/types';
import { formatARS, redondear } from '../lib/format';

const OPCIONES_REDONDEO = [50, 100, 500];

export function ListaPrecios() {
  const [items, setItems] = useState<ProductoDTO[]>([]);
  const [redondeo, setRedondeo] = useState(100);

  useEffect(() => {
    api.get<ProductoDTO[]>('/productos').then(setItems);
    api.get<ConfigDTO>('/config').then((c) => setRedondeo(Number(c.redondeo_lista_precios ?? 100)));
  }, []);

  const filas = useMemo(
    () =>
      items
        .filter((p) => p.activo)
        .map((p) => ({
          nombre: p.nombre,
          tipo: p.tipo,
          precioActual: p.precio_actual,
          precioSugerido: redondear(p.calculo.precioSugerido, redondeo),
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [items, redondeo]
  );

  async function cambiarRedondeo(valor: number) {
    setRedondeo(valor);
    await api.put('/config', { redondeo_lista_precios: String(valor) });
  }

  function exportarExcel() {
    const data = filas.map((f) => ({
      Producto: f.nombre,
      Tipo: f.tipo === 'combo' ? 'Combo' : 'Individual',
      'Precio actual': f.precioActual,
      'Precio sugerido': f.precioSugerido,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lista de precios');
    XLSX.writeFile(wb, `lista-precios-mesa-dulce-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Lista de precios</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-bordo-500">Redondear a</label>
          <select
            className="input w-28"
            value={redondeo}
            onChange={(e) => cambiarRedondeo(Number(e.target.value))}
          >
            {OPCIONES_REDONDEO.map((r) => (
              <option key={r} value={r}>
                ${r}
              </option>
            ))}
          </select>
          <button className="btn-secondary" onClick={exportarExcel}>
            Exportar Excel
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="hidden print:block text-2xl font-display font-semibold mb-4">
          Mesa Dulce — Lista de precios
        </h2>
        <table className="table-clean">
          <thead>
            <tr>
              <th>Producto</th>
              <th className="print:hidden">Tipo</th>
              <th>Precio</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.nombre}>
                <td className="font-medium">{f.nombre}</td>
                <td className="print:hidden capitalize">{f.tipo}</td>
                <td className="text-lg font-display font-semibold">{formatARS(f.precioSugerido)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
