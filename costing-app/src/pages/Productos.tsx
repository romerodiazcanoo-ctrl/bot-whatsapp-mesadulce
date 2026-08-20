import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { ProductoDTO } from '../lib/types';
import { formatARS, formatPct } from '../lib/format';

export function Productos() {
  const [items, setItems] = useState<ProductoDTO[]>([]);
  const [tipo, setTipo] = useState<'todos' | 'individual' | 'combo'>('todos');

  useEffect(() => {
    api.get<ProductoDTO[]>('/productos').then(setItems);
  }, []);

  const filtrados = useMemo(() => items.filter((p) => tipo === 'todos' || p.tipo === tipo), [items, tipo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Productos</h1>
        <select className="input max-w-[200px]" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
          <option value="todos">Todos</option>
          <option value="combo">Combos</option>
          <option value="individual">Individuales</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-clean">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Costo total</th>
              <th>Precio actual</th>
              <th>Precio sugerido</th>
              <th>Margen actual</th>
              <th>Margen objetivo</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => {
              const ok = p.calculo.margenActual >= p.calculo.margenObjetivo;
              return (
                <tr key={p.id}>
                  <td className="font-medium">
                    <Link to={`/productos/${p.id}`} className="hover:underline">
                      {p.nombre}
                    </Link>
                    {p.calculo.desactualizado && <span className="text-bordo-500 ml-1">⚠</span>}
                  </td>
                  <td>{formatARS(p.calculo.costoTotal)}</td>
                  <td>{formatARS(p.calculo.precioActual)}</td>
                  <td>{formatARS(p.calculo.precioSugerido)}</td>
                  <td>
                    <span className={`badge ${ok ? 'badge-verde' : 'badge-rojo'}`}>
                      {formatPct(p.calculo.margenActual)}
                    </span>
                  </td>
                  <td>{formatPct(p.calculo.margenObjetivo)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
