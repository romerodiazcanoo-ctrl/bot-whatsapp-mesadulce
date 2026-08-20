import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { InsumoDTO } from '../lib/types';
import { formatARSDecimal, hoyISO } from '../lib/format';

export function ActualizacionRapida() {
  const [pendientes, setPendientes] = useState<InsumoDTO[]>([]);
  const [valores, setValores] = useState<Record<number, string>>({});
  const [guardados, setGuardados] = useState<Set<number>>(new Set());

  function recargar() {
    api.get<InsumoDTO[]>('/insumos').then((insumos) => {
      const rojos = insumos.filter((i) => i.semaforo === 'rojo').sort((a, b) => a.nombre.localeCompare(b.nombre));
      setPendientes(rojos);
    });
  }

  useEffect(recargar, []);

  async function guardarUno(i: InsumoDTO) {
    const valor = valores[i.id];
    if (!valor) return;
    await api.patch(`/insumos/${i.id}/costo`, { costo_compra: Number(valor), fecha_costo: hoyISO() });
    setGuardados((prev) => new Set(prev).add(i.id));
  }

  async function onKeyDown(e: React.KeyboardEvent, i: InsumoDTO, siguienteId: number | undefined) {
    if (e.key === 'Enter') {
      await guardarUno(i);
      if (siguienteId) {
        document.getElementById(`costo-${siguienteId}`)?.focus();
      }
    }
  }

  const restantes = pendientes.filter((i) => !guardados.has(i.id));

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link to="/insumos" className="text-sm text-bordo-500 hover:underline">
          ← Volver a insumos
        </Link>
        <h1 className="text-3xl font-semibold mt-2">Actualización rápida de costos</h1>
        <p className="text-bordo-400 mt-1">
          Escribí el nuevo costo de compra y apretá Enter. La fecha se actualiza sola a hoy.
        </p>
      </div>

      {pendientes.length === 0 ? (
        <div className="card text-bordo-400">No hay insumos desactualizados. 🎉</div>
      ) : (
        <div className="card">
          <p className="text-sm text-bordo-500 mb-4">
            {restantes.length} de {pendientes.length} pendientes
          </p>
          <div className="space-y-3">
            {pendientes.map((i, idx) => {
              const hecho = guardados.has(i.id);
              const siguiente = pendientes[idx + 1]?.id;
              return (
                <div
                  key={i.id}
                  className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${
                    hecho ? 'bg-emerald-50' : 'bg-bordo-50/50'
                  }`}
                >
                  <div>
                    <p className="font-medium text-sm">{i.nombre}</p>
                    <p className="text-xs text-bordo-400">
                      Actual: {formatARSDecimal(i.costo_compra)} por {i.cantidad_por_compra} {i.unidad_base} (
                      {i.unidad_compra})
                    </p>
                  </div>
                  <input
                    id={`costo-${i.id}`}
                    className="input w-32 text-right"
                    type="number"
                    step="any"
                    placeholder="nuevo $"
                    disabled={hecho}
                    value={valores[i.id] ?? ''}
                    onChange={(e) => setValores({ ...valores, [i.id]: e.target.value })}
                    onKeyDown={(e) => onKeyDown(e, i, siguiente)}
                  />
                  {hecho && <span className="text-emerald-600 text-sm">✔</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
