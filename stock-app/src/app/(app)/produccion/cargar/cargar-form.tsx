"use client";

import { useActionState, useMemo, useState } from "react";
import { cargarProduccion, type CargarProduccionResult } from "@/lib/actions/produccion";

type Variedad = {
  id: string;
  nombre: string;
  categoria: "COOKIE_CLASICA" | "COOKIE_RELLENA" | "BROWNIE";
  pesoUnitarioGramos: number | null;
};

async function submit(_prev: CargarProduccionResult | null, formData: FormData) {
  return cargarProduccion(formData);
}

const PORCIONES_POR_PLANCHA = 12;

export default function CargarProduccionForm({ variedades }: { variedades: Variedad[] }) {
  const [state, formAction, pending] = useActionState(submit, null);
  const [varietyId, setVarietyId] = useState(variedades[0]?.id ?? "");
  const [peso, setPeso] = useState("");
  const [porciones, setPorciones] = useState("");
  const [planchas, setPlanchas] = useState("");

  const variedad = variedades.find((v) => v.id === varietyId);
  const esBrownie = variedad?.categoria === "BROWNIE";

  const rendimientoEstimado = useMemo(() => {
    if (!variedad) return null;
    if (esBrownie) {
      const p = Number(porciones || 0) + Number(planchas || 0) * PORCIONES_POR_PLANCHA;
      return p > 0 ? p : null;
    }
    if (!variedad.pesoUnitarioGramos || !peso) return null;
    const pesoNum = Number(peso);
    if (!pesoNum) return null;
    return Math.round((pesoNum / variedad.pesoUnitarioGramos) * 100) / 100;
  }, [variedad, esBrownie, peso, porciones, planchas]);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <label className="flex flex-col text-sm text-stone-600">
        Variedad
        <select
          name="varietyId"
          value={varietyId}
          onChange={(e) => setVarietyId(e.target.value)}
          className="mt-1 rounded-md border border-stone-300 px-3 py-2"
        >
          {variedades.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre}
            </option>
          ))}
        </select>
      </label>

      {esBrownie ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col text-sm text-stone-600">
            Porciones sueltas
            <input
              type="number"
              name="unidadesDirectas"
              min="0"
              value={porciones}
              onChange={(e) => setPorciones(e.target.value)}
              className="mt-1 rounded-md border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col text-sm text-stone-600">
            Planchas (1 = 12 porciones)
            <input
              type="number"
              name="planchas"
              min="0"
              value={planchas}
              onChange={(e) => setPlanchas(e.target.value)}
              className="mt-1 rounded-md border border-stone-300 px-3 py-2"
            />
          </label>
        </div>
      ) : (
        <label className="flex flex-col text-sm text-stone-600">
          Peso total de masa producida (gramos)
          <input
            type="number"
            name="pesoMasaGramos"
            min="0"
            step="1"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            className="mt-1 rounded-md border border-stone-300 px-3 py-2"
            required
          />
          <span className="mt-1 text-xs text-stone-400">
            Peso unitario de referencia: {variedad?.pesoUnitarioGramos ?? "—"} g
          </span>
        </label>
      )}

      {rendimientoEstimado !== null && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Rendimiento estimado: <strong>{rendimientoEstimado}</strong>{" "}
          {esBrownie ? "porciones" : "unidades"}
        </p>
      )}

      <label className="flex flex-col text-sm text-stone-600">
        Fecha
        <input
          type="date"
          name="fecha"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="mt-1 rounded-md border border-stone-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col text-sm text-stone-600">
        Nota (opcional)
        <input
          type="text"
          name="nota"
          placeholder="Ej: tanda de la mañana"
          className="mt-1 rounded-md border border-stone-300 px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Cargar producción"}
      </button>

      {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}
      {state && state.ok && (
        <p className="text-sm text-emerald-600">
          Producción cargada. Rendimiento sumado al stock: <strong>{state.unidadesResultantes}</strong>{" "}
          {esBrownie ? "porciones" : "unidades"}.
        </p>
      )}
    </form>
  );
}
