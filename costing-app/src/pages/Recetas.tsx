import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { RecetaDTO } from '../lib/types';
import { formatARSDecimal } from '../lib/format';

export function Recetas() {
  const [items, setItems] = useState<RecetaDTO[]>([]);
  const [clasificacion, setClasificacion] = useState('todas');

  useEffect(() => {
    api.get<RecetaDTO[]>('/recetas').then(setItems);
  }, []);

  const clasificaciones = useMemo(
    () => ['todas', ...Array.from(new Set(items.map((r) => r.clasificacion))).sort()],
    [items]
  );
  const filtradas = items.filter((r) => clasificacion === 'todas' || r.clasificacion === clasificacion);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Recetas</h1>
        <select className="input max-w-[220px]" value={clasificacion} onChange={(e) => setClasificacion(e.target.value)}>
          {clasificaciones.map((c) => (
            <option key={c} value={c}>
              {c === 'todas' ? 'Todas las clasificaciones' : c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtradas.map((r) => (
          <Link to={`/recetas/${r.id}`} key={r.id} className="card hover:shadow-md transition-shadow">
            <p className="text-xs uppercase tracking-wide text-bordo-400">{r.clasificacion}</p>
            <h2 className="text-lg font-semibold mt-1">{r.nombre}</h2>
            <p className="text-2xl font-display font-semibold mt-3">{formatARSDecimal(r.costoPorUnidad)}</p>
            <p className="text-xs text-bordo-400">por unidad · rinde {r.rendimiento}</p>
            {r.desactualizado && <span className="badge badge-rojo mt-2 inline-flex">insumo desactualizado</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
