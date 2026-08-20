import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { ProductoCalculoDTO, ProductoDTO } from '../lib/types';
import { formatARS, formatARSDecimal, formatPct } from '../lib/format';

export function ProductoDetalle() {
  const { id } = useParams();
  const [producto, setProducto] = useState<ProductoDTO | null>(null);
  const [margenSimulado, setMargenSimulado] = useState(0.7);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get<ProductoDTO>(`/productos/${id}`).then((p) => {
      setProducto(p);
      setMargenSimulado(p.calculo.margenObjetivo);
    });
  }, [id]);

  if (!producto) return <div className="text-bordo-400">Cargando…</div>;

  const precioSugeridoSimulado =
    margenSimulado < 1 ? producto.calculo.costoTotal / (1 - margenSimulado) : 0;

  async function guardarMargen() {
    if (!producto) return;
    setGuardando(true);
    const body = {
      nombre: producto.nombre,
      tipo: producto.tipo,
      packaging_armado_id: producto.packaging_armado_id,
      precio_actual: producto.precio_actual,
      margen_objetivo: margenSimulado,
      activo: producto.activo,
      recetas: producto.calculo.recetas.map((r) => ({ receta_id: r.recetaId, cantidad: r.cantidad })),
    };
    const calculo = await api.put<ProductoCalculoDTO>(`/productos/${producto.id}`, body);
    setProducto({ ...producto, margen_objetivo: margenSimulado, calculo });
    setGuardando(false);
  }

  const c = producto.calculo;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link to="/productos" className="text-sm text-bordo-500 hover:underline">
          ← Volver a productos
        </Link>
        <h1 className="text-3xl font-semibold mt-1">{producto.nombre}</h1>
        <p className="text-bordo-400 capitalize">{producto.tipo}</p>
      </div>

      {c.desactualizado && (
        <div className="card bg-amber-50 border-amber-200 text-amber-800 text-sm">
          ⚠ Este producto usa recetas con algún insumo desactualizado.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Costo total" value={formatARS(c.costoTotal)} />
        <Stat label="Precio actual" value={formatARS(c.precioActual)} />
        <Stat label="Margen actual" value={formatPct(c.margenActual)} />
        <Stat label="Markup actual" value={`${c.markupActual.toFixed(2)}x`} />
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Desglose</h2>
        <table className="table-clean">
          <thead>
            <tr>
              <th>Receta</th>
              <th>Cantidad</th>
              <th>Costo unitario</th>
              <th>Costo parcial</th>
            </tr>
          </thead>
          <tbody>
            {c.recetas.map((r) => (
              <tr key={r.recetaId}>
                <td>
                  <Link to={`/recetas/${r.recetaId}`} className="hover:underline">
                    {r.nombre}
                  </Link>
                  {r.desactualizado && <span className="text-bordo-500 ml-1">⚠</span>}
                </td>
                <td>{r.cantidad}</td>
                <td>{formatARSDecimal(r.costoUnitario)}</td>
                <td>{formatARSDecimal(r.costoParcial)}</td>
              </tr>
            ))}
            <tr>
              <td className="font-medium">Packaging</td>
              <td colSpan={2}></td>
              <td>{formatARSDecimal(c.costoPackaging)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Simulador de margen objetivo</h2>
        <div className="flex items-center gap-4 mb-2">
          <input
            type="range"
            min={0}
            max={0.9}
            step={0.01}
            value={margenSimulado}
            onChange={(e) => setMargenSimulado(Number(e.target.value))}
            className="flex-1 accent-bordo-700"
          />
          <span className="w-16 text-right font-medium">{formatPct(margenSimulado)}</span>
        </div>
        <div className="flex items-end justify-between mt-4">
          <div>
            <p className="label">Precio sugerido</p>
            <p className="text-4xl font-display font-semibold">{formatARS(precioSugeridoSimulado)}</p>
            <p className="text-sm text-bordo-400 mt-1">
              Diferencia vs precio actual: {formatARS(precioSugeridoSimulado - c.precioActual)}
            </p>
          </div>
          <button className="btn-primary" disabled={guardando} onClick={guardarMargen}>
            {guardando ? 'Guardando…' : 'Guardar como margen objetivo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="label">{label}</p>
      <p className="text-2xl font-display font-semibold">{value}</p>
    </div>
  );
}
