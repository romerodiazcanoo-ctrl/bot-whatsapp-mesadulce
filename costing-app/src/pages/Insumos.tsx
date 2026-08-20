import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { InsumoDTO } from '../lib/types';
import { Semaforo } from '../components/Semaforo';
import { formatARSDecimal, formatFecha, hoyISO } from '../lib/format';
import { conversionConocida, UNIDADES_COMPRA_SUGERIDAS } from '../../shared/units';

type FormState = {
  id: number | null;
  nombre: string;
  categoria: 'materia_prima' | 'packaging' | 'otro';
  unidad_compra: string;
  cantidad_compra_ingresada: string;
  costo_compra: string;
  fecha_costo: string;
  proveedor: string;
};

const VACIO: FormState = {
  id: null,
  nombre: '',
  categoria: 'materia_prima',
  unidad_compra: 'kg',
  cantidad_compra_ingresada: '',
  costo_compra: '',
  fecha_costo: hoyISO(),
  proveedor: '',
};

export function Insumos() {
  const [insumos, setInsumos] = useState<InsumoDTO[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<string>('todas');
  const [panel, setPanel] = useState<FormState | null>(null);

  function recargar() {
    api.get<InsumoDTO[]>('/insumos').then(setInsumos);
  }

  useEffect(recargar, []);

  const filtrados = useMemo(() => {
    return insumos.filter((i) => {
      const matchNombre = i.nombre.toLowerCase().includes(busqueda.toLowerCase());
      const matchCategoria = categoria === 'todas' || i.categoria === categoria;
      return matchNombre && matchCategoria;
    });
  }, [insumos, busqueda, categoria]);

  function abrirNuevo() {
    setPanel({ ...VACIO });
  }

  function abrirEdicion(i: InsumoDTO) {
    const conv = conversionConocida(i.unidad_compra);
    const cantidadIngresada = conv ? i.cantidad_por_compra / conv.factor : i.cantidad_por_compra;
    setPanel({
      id: i.id,
      nombre: i.nombre,
      categoria: i.categoria,
      unidad_compra: i.unidad_compra,
      cantidad_compra_ingresada: String(cantidadIngresada),
      costo_compra: String(i.costo_compra),
      fecha_costo: i.fecha_costo ?? hoyISO(),
      proveedor: i.proveedor ?? '',
    });
  }

  async function guardar(f: FormState) {
    const body = {
      nombre: f.nombre,
      categoria: f.categoria,
      unidad_compra: f.unidad_compra,
      cantidad_compra_ingresada: Number(f.cantidad_compra_ingresada),
      costo_compra: Number(f.costo_compra),
      fecha_costo: f.fecha_costo || null,
      proveedor: f.proveedor || null,
    };
    if (f.id === null) {
      await api.post('/insumos', body);
    } else {
      await api.put(`/insumos/${f.id}`, body);
    }
    setPanel(null);
    recargar();
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar este insumo?')) return;
    await api.delete(`/insumos/${id}`);
    recargar();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Insumos</h1>
        <div className="flex gap-2">
          <Link to="/insumos/actualizacion-rapida" className="btn-secondary">
            Actualización rápida
          </Link>
          <button className="btn-primary" onClick={abrirNuevo}>
            + Nuevo insumo
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          className="input max-w-xs"
          placeholder="Buscar insumo…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select className="input max-w-[200px]" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="todas">Todas las categorías</option>
          <option value="materia_prima">Materia prima</option>
          <option value="packaging">Packaging</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-clean">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Compra</th>
              <th>Costo compra</th>
              <th>Costo unitario</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((i) => (
              <tr key={i.id}>
                <td className="font-medium">{i.nombre}</td>
                <td>
                  {i.cantidad_por_compra} {i.unidad_base} ({i.unidad_compra})
                </td>
                <td>{formatARSDecimal(i.costo_compra)}</td>
                <td>
                  {formatARSDecimal(i.costoLegible)}/{i.unidadLegible}
                  <span className="text-bordo-300 text-xs ml-1">
                    ({formatARSDecimal(i.costoUnitario)}/{i.unidad_base})
                  </span>
                </td>
                <td>{formatFecha(i.fecha_costo)}</td>
                <td>
                  <Semaforo estado={i.semaforo} dias={i.diasDesdeActualizacion} />
                </td>
                <td className="text-right">
                  <button className="btn-ghost text-xs" onClick={() => abrirEdicion(i)}>
                    Editar
                  </button>
                  <button className="btn-ghost text-xs text-bordo-700" onClick={() => eliminar(i.id)}>
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {panel && <InsumoPanel form={panel} onChange={setPanel} onGuardar={guardar} onCerrar={() => setPanel(null)} />}
    </div>
  );
}

function InsumoPanel({
  form,
  onChange,
  onGuardar,
  onCerrar,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
  onGuardar: (f: FormState) => void;
  onCerrar: () => void;
}) {
  const conv = conversionConocida(form.unidad_compra);
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-bordo-800/30" onClick={onCerrar} />
      <div className="relative w-full max-w-md bg-white h-full shadow-xl p-6 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">{form.id ? 'Editar insumo' : 'Nuevo insumo'}</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input
              className="input"
              value={form.nombre}
              onChange={(e) => onChange({ ...form, nombre: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Categoría</label>
            <select
              className="input"
              value={form.categoria}
              onChange={(e) => onChange({ ...form, categoria: e.target.value as FormState['categoria'] })}
            >
              <option value="materia_prima">Materia prima</option>
              <option value="packaging">Packaging</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Unidad de compra</label>
              <input
                className="input"
                list="unidades-compra"
                value={form.unidad_compra}
                onChange={(e) => onChange({ ...form, unidad_compra: e.target.value })}
              />
              <datalist id="unidades-compra">
                {UNIDADES_COMPRA_SUGERIDAS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">Cantidad comprada</label>
              <input
                className="input"
                type="number"
                step="any"
                value={form.cantidad_compra_ingresada}
                onChange={(e) => onChange({ ...form, cantidad_compra_ingresada: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-bordo-400">
            {conv
              ? `Se guarda como ${(Number(form.cantidad_compra_ingresada || 0) * conv.factor).toLocaleString('es-AR')} ${conv.unidadBase}.`
              : 'Unidad sin conversión automática: cargá la cantidad ya en unidad base (ej. cuántas unidades trae la caja).'}
          </p>
          <div>
            <label className="label">Costo de la compra ($)</label>
            <input
              className="input"
              type="number"
              step="any"
              value={form.costo_compra}
              onChange={(e) => onChange({ ...form, costo_compra: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Fecha del costo</label>
            <input
              className="input"
              type="date"
              value={form.fecha_costo}
              onChange={(e) => onChange({ ...form, fecha_costo: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Proveedor (opcional)</label>
            <input
              className="input"
              value={form.proveedor}
              onChange={(e) => onChange({ ...form, proveedor: e.target.value })}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button className="btn-primary flex-1" onClick={() => onGuardar(form)}>
            Guardar
          </button>
          <button className="btn-ghost" onClick={onCerrar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
