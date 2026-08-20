import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { PreparacionDTO } from '../lib/types';
import { formatARSDecimal } from '../lib/format';

export function Preparaciones() {
  const [items, setItems] = useState<PreparacionDTO[]>([]);

  useEffect(() => {
    api.get<PreparacionDTO[]>('/preparaciones').then(setItems);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Preparaciones</h1>
        <Link to="/preparaciones/nueva" className="btn-primary">
          + Nueva preparación
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-clean">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Rinde</th>
              <th>Costo por unidad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td className="font-medium">
                  <Link to={`/preparaciones/${p.id}`} className="hover:underline">
                    {p.nombre}
                  </Link>
                </td>
                <td>
                  {p.rinde_cantidad} {p.rinde_unidad}
                </td>
                <td>{p.rinde_cantidad > 0 ? `${formatARSDecimal(p.costoPorUnidad)}/${p.rinde_unidad}` : '—'}</td>
                <td>
                  {p.error ? (
                    <span className="badge badge-rojo">referencia circular</span>
                  ) : p.rinde_cantidad === 0 ? (
                    <span className="badge badge-amarillo">sin completar</span>
                  ) : p.desactualizado ? (
                    <span className="badge badge-rojo">insumo desactualizado</span>
                  ) : (
                    <span className="badge badge-verde">ok</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
