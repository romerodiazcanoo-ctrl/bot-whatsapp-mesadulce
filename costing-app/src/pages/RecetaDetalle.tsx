import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { RecetaDetalleDTO } from '../lib/types';
import { formatARSDecimal, formatPct } from '../lib/format';

const ESCALAS = [1, 1.5, 2] as const;

export function RecetaDetalle() {
  const { id } = useParams();
  const [receta, setReceta] = useState<RecetaDetalleDTO | null>(null);
  const [escala, setEscala] = useState<number>(1);
  const [escalaLibre, setEscalaLibre] = useState('');
  const [orden, setOrden] = useState<'orden' | 'porcentaje'>('orden');

  useEffect(() => {
    api.get<RecetaDetalleDTO>(`/recetas/${id}`).then(setReceta);
  }, [id]);

  const ingredientesOrdenados = useMemo(() => {
    if (!receta) return [];
    const items = [...receta.calculo.ingredientes];
    if (orden === 'porcentaje') items.sort((a, b) => b.porcentaje - a.porcentaje);
    return items;
  }, [receta, orden]);

  if (!receta) return <div className="text-bordo-400">Cargando…</div>;

  const factor = escala;

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <div>
          <Link to="/recetas" className="text-sm text-bordo-500 hover:underline">
            ← Volver a recetas
          </Link>
          <h1 className="text-3xl font-semibold mt-1">{receta.nombre}</h1>
          <p className="text-bordo-400">{receta.clasificacion}</p>
        </div>
        <button className="btn-secondary" onClick={() => window.print()}>
          🖨 Imprimir receta escalada
        </button>
      </div>

      {receta.calculo.desactualizado && (
        <div className="no-print card bg-amber-50 border-amber-200 text-amber-800 text-sm">
          ⚠ Uno o más ingredientes de esta receta tienen el costo desactualizado. El total puede no reflejar el
          precio real de mercado.
        </div>
      )}

      <div className="no-print card flex flex-wrap items-end gap-6">
        <div>
          <p className="label">Rendimiento base</p>
          <p className="text-3xl font-display font-semibold">
            {receta.rendimiento} {receta.rendimiento_unidad}
          </p>
        </div>
        <div>
          <p className="label">Costo por unidad</p>
          <p className="text-3xl font-display font-semibold">{formatARSDecimal(receta.calculo.costoPorUnidad)}</p>
        </div>
        <div>
          <p className="label">Escala</p>
          <div className="flex gap-2">
            {ESCALAS.map((e) => (
              <button
                key={e}
                className={escala === e ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
                onClick={() => {
                  setEscala(e);
                  setEscalaLibre('');
                }}
              >
                x{e}
              </button>
            ))}
            <input
              className="input w-24"
              placeholder="libre"
              type="number"
              step="any"
              value={escalaLibre}
              onChange={(e) => {
                setEscalaLibre(e.target.value);
                const n = Number(e.target.value);
                if (n > 0) setEscala(n);
              }}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="no-print flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Ingredientes {factor !== 1 && `(x${factor})`}</h2>
          <button
            className="text-xs text-bordo-500 underline"
            onClick={() => setOrden(orden === 'orden' ? 'porcentaje' : 'orden')}
          >
            Ordenar por {orden === 'orden' ? '% de costo' : 'orden de receta'}
          </button>
        </div>

        <div className="hidden print:block mb-4">
          <h2 className="text-2xl font-display font-semibold">{receta.nombre}</h2>
          <p className="text-bordo-500">
            Rendimiento: {(receta.rendimiento * factor).toLocaleString('es-AR')} {receta.rendimiento_unidad} (x
            {factor})
          </p>
        </div>

        <table className="table-clean">
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>Cantidad</th>
              <th className="print:hidden">Costo unitario</th>
              <th className="print:hidden">Costo parcial</th>
              <th className="print:hidden">% del total</th>
            </tr>
          </thead>
          <tbody>
            {ingredientesOrdenados.map((ing) => (
              <tr key={ing.id}>
                <td className="font-medium">
                  {ing.nombre}
                  {ing.desactualizado && <span className="text-bordo-500 ml-1" title="costo desactualizado">⚠</span>}
                </td>
                <td>
                  {(ing.cantidad * factor).toLocaleString('es-AR', { maximumFractionDigits: 3 })} {ing.unidad}
                </td>
                <td className="print:hidden">{formatARSDecimal(ing.costoUnitarioReferencia)}</td>
                <td className="print:hidden">{formatARSDecimal(ing.costoParcial * factor)}</td>
                <td className="print:hidden">{formatPct(ing.porcentaje)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {receta.notas && (
          <div className="mt-4 pt-4 border-t border-bordo-50">
            <p className="label">Notas</p>
            <p className="text-sm whitespace-pre-wrap">{receta.notas}</p>
          </div>
        )}
      </div>
    </div>
  );
}
