import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { InsumoDTO, PreparacionDetalleDTO, PreparacionDTO } from '../lib/types';
import { formatARSDecimal, formatPct } from '../lib/format';

interface ComponenteForm {
  tipo: 'insumo' | 'preparacion';
  referencia_id: number;
  cantidad: number;
  unidad: string;
}

export function PreparacionDetalle() {
  const { id } = useParams();
  const esNueva = id === 'nueva';
  const navigate = useNavigate();

  const [detalle, setDetalle] = useState<PreparacionDetalleDTO | null>(null);
  const [insumos, setInsumos] = useState<InsumoDTO[]>([]);
  const [preparaciones, setPreparaciones] = useState<PreparacionDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [notas, setNotas] = useState('');
  const [rindeCantidad, setRindeCantidad] = useState('0');
  const [rindeUnidad, setRindeUnidad] = useState('g');
  const [componentes, setComponentes] = useState<ComponenteForm[]>([]);

  useEffect(() => {
    api.get<InsumoDTO[]>('/insumos').then(setInsumos);
    api.get<PreparacionDTO[]>('/preparaciones').then(setPreparaciones);
  }, []);

  useEffect(() => {
    if (esNueva) return;
    api.get<PreparacionDetalleDTO>(`/preparaciones/${id}`).then((d) => {
      setDetalle(d);
      setNombre(d.nombre);
      setDescripcion(d.descripcion ?? '');
      setNotas(d.notas ?? '');
      setRindeCantidad(String(d.rinde_cantidad));
      setRindeUnidad(d.rinde_unidad);
      setComponentes(
        d.calculo.componentes.map((c) => ({
          tipo: c.tipo,
          referencia_id: c.referenciaId,
          cantidad: c.cantidad,
          unidad: c.unidad,
        }))
      );
    });
  }, [id, esNueva]);

  function nombreDe(tipo: 'insumo' | 'preparacion', refId: number) {
    if (tipo === 'insumo') return insumos.find((i) => i.id === refId)?.nombre ?? '?';
    return preparaciones.find((p) => p.id === refId)?.nombre ?? '?';
  }

  function agregarComponente() {
    const primerInsumo = insumos[0];
    if (!primerInsumo) return;
    setComponentes([...componentes, { tipo: 'insumo', referencia_id: primerInsumo.id, cantidad: 0, unidad: 'g' }]);
  }

  function actualizarComponente(idx: number, cambios: Partial<ComponenteForm>) {
    setComponentes(componentes.map((c, i) => (i === idx ? { ...c, ...cambios } : c)));
  }

  function quitarComponente(idx: number) {
    setComponentes(componentes.filter((_, i) => i !== idx));
  }

  async function guardar() {
    setError(null);
    const body = {
      nombre,
      descripcion: descripcion || null,
      notas: notas || null,
      rinde_cantidad: Number(rindeCantidad),
      rinde_unidad: rindeUnidad,
      componentes,
    };
    try {
      if (esNueva) {
        const creada = await api.post<{ id: number } & PreparacionDetalleDTO>('/preparaciones', body);
        navigate(`/preparaciones`);
        void creada;
      } else {
        await api.put(`/preparaciones/${id}`, body);
        navigate('/preparaciones');
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold">{esNueva ? 'Nueva preparación' : 'Editar preparación'}</h1>

      {error && <div className="card bg-bordo-50 text-bordo-700 border-bordo-200">{error}</div>}

      <div className="card space-y-4">
        <div>
          <label className="label">Nombre</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div>
          <label className="label">Descripción</label>
          <input className="input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>
        <div>
          <label className="label">Notas de elaboración</label>
          <textarea className="input" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Rinde — cantidad</label>
            <input
              className="input"
              type="number"
              step="any"
              value={rindeCantidad}
              onChange={(e) => setRindeCantidad(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Rinde — unidad</label>
            <input className="input" value={rindeUnidad} onChange={(e) => setRindeUnidad(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Ingredientes</h2>
          <button className="btn-secondary text-sm" onClick={agregarComponente}>
            + Agregar
          </button>
        </div>
        <div className="space-y-2">
          {componentes.map((c, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <select
                className="input w-28"
                value={c.tipo}
                onChange={(e) => actualizarComponente(idx, { tipo: e.target.value as 'insumo' | 'preparacion' })}
              >
                <option value="insumo">Insumo</option>
                <option value="preparacion">Preparación</option>
              </select>
              <select
                className="input flex-1"
                value={c.referencia_id}
                onChange={(e) => actualizarComponente(idx, { referencia_id: Number(e.target.value) })}
              >
                {(c.tipo === 'insumo' ? insumos : preparaciones).map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.nombre}
                  </option>
                ))}
              </select>
              <input
                className="input w-24"
                type="number"
                step="any"
                value={c.cantidad}
                onChange={(e) => actualizarComponente(idx, { cantidad: Number(e.target.value) })}
              />
              <input
                className="input w-20"
                value={c.unidad}
                onChange={(e) => actualizarComponente(idx, { unidad: e.target.value })}
              />
              <button className="btn-ghost text-bordo-700" onClick={() => quitarComponente(idx)}>
                ✕
              </button>
            </div>
          ))}
          {componentes.length === 0 && <p className="text-bordo-400 text-sm">Sin ingredientes cargados todavía.</p>}
        </div>
      </div>

      {detalle && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Costo actual</h2>
          <p className="text-3xl font-display font-semibold">
            {formatARSDecimal(detalle.calculo.costoPorUnidad)} / {detalle.rinde_unidad}
          </p>
          <table className="table-clean mt-4">
            <thead>
              <tr>
                <th>Ingrediente</th>
                <th>Cantidad</th>
                <th>Costo parcial</th>
                <th>% del total</th>
              </tr>
            </thead>
            <tbody>
              {detalle.calculo.componentes.map((c) => (
                <tr key={c.id}>
                  <td>{nombreDe(c.tipo, c.referenciaId) || c.nombre}</td>
                  <td>
                    {c.cantidad} {c.unidad}
                  </td>
                  <td>{formatARSDecimal(c.costoParcial)}</td>
                  <td>{formatPct(c.porcentaje)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2">
        <button className="btn-primary" onClick={guardar}>
          Guardar
        </button>
      </div>
    </div>
  );
}
