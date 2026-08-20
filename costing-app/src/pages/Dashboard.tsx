import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { DashboardDTO } from '../lib/types';
import { formatARS, formatPct, formatFecha } from '../lib/format';

export function Dashboard() {
  const [data, setData] = useState<DashboardDTO | null>(null);

  useEffect(() => {
    api.get<DashboardDTO>('/dashboard').then(setData);
  }, []);

  if (!data) return <div className="text-bordo-400">Cargando…</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-bordo-400 mt-1">
          Última actualización de costos: {data.ultimaActualizacion ? formatFecha(data.ultimaActualizacion) : 'sin datos'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card">
          <p className="label">Insumos desactualizados</p>
          <p className="text-5xl font-display font-semibold text-bordo-700">
            {data.cantidadInsumosDesactualizados}
          </p>
          <Link to="/insumos" className="text-sm text-bordo-600 underline mt-2 inline-block">
            Ver insumos →
          </Link>
        </div>
        <div className="card">
          <p className="label">Productos por debajo del precio sugerido</p>
          <p className="text-5xl font-display font-semibold text-bordo-700">{data.productosBajoSugerido.length}</p>
          <Link to="/productos" className="text-sm text-bordo-600 underline mt-2 inline-block">
            Ver productos →
          </Link>
        </div>
        <div className="card">
          <p className="label">Actualización rápida de costos</p>
          <p className="text-sm text-bordo-500 mb-3">Cargá los insumos en rojo, uno atrás de otro.</p>
          <Link to="/insumos/actualizacion-rapida" className="btn-primary">
            Actualizar ahora
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Insumos con costo desactualizado</h2>
          {data.insumosDesactualizados.length === 0 ? (
            <p className="text-bordo-400 text-sm">Todo al día 🎉</p>
          ) : (
            <ul className="divide-y divide-bordo-50">
              {data.insumosDesactualizados.map((i) => (
                <li key={i.id} className="py-2 text-sm flex justify-between">
                  <span>{i.nombre}</span>
                  <span className="badge badge-rojo">sin actualizar</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Productos por debajo del precio sugerido</h2>
          {data.productosBajoSugerido.length === 0 ? (
            <p className="text-bordo-400 text-sm">Todos los precios están al nivel sugerido.</p>
          ) : (
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Actual</th>
                  <th>Sugerido</th>
                  <th>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {data.productosBajoSugerido.slice(0, 8).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/productos/${p.id}`} className="hover:underline">
                        {p.nombre}
                      </Link>
                    </td>
                    <td>{formatARS(p.precioActual)}</td>
                    <td>{formatARS(p.precioSugerido)}</td>
                    <td className="text-bordo-700 font-medium">
                      {formatARS(p.diferenciaPesos)} ({formatPct(p.diferenciaPorcentaje)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Los 5 insumos que más pesan en el costo de la carta</h2>
        {data.topInsumos.length === 0 ? (
          <p className="text-bordo-400 text-sm">Sin datos todavía.</p>
        ) : (
          <div className="space-y-3">
            {data.topInsumos.map((i) => (
              <div key={i.insumoId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{i.nombre}</span>
                  <span className="text-bordo-400">{formatPct(i.porcentaje)}</span>
                </div>
                <div className="h-2 bg-bordo-50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-bordo-600 rounded-full"
                    style={{ width: `${Math.min(100, i.porcentaje * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
