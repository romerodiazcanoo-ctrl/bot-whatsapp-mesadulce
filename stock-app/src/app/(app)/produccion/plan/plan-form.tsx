"use client";

import { useActionState } from "react";
import { crearPlanProduccion } from "@/lib/actions/plan";
import type { ActionResult } from "@/lib/actions/stock";

type Variedad = { id: string; nombre: string; categoria: string };

async function submit(_prev: ActionResult | null, formData: FormData) {
  return crearPlanProduccion(formData);
}

export default function PlanForm({ variedades }: { variedades: Variedad[] }) {
  const [state, formAction, pending] = useActionState(submit, null);
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col text-sm text-stone-600">
          Nombre del plan
          <input
            type="text"
            name="nombre"
            placeholder="Ej: Semana del 28/07"
            required
            className="mt-1 rounded-md border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col text-sm text-stone-600">
          Fecha inicio
          <input
            type="date"
            name="fechaInicio"
            defaultValue={hoy}
            required
            className="mt-1 rounded-md border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col text-sm text-stone-600">
          Fecha fin
          <input
            type="date"
            name="fechaFin"
            defaultValue={hoy}
            required
            className="mt-1 rounded-md border border-stone-300 px-3 py-2"
          />
        </label>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-stone-700">
          Unidades objetivo por variedad (dejá en 0 las que no correspondan)
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {variedades.map((v) => (
            <label key={v.id} className="flex flex-col text-sm text-stone-600">
              {v.nombre}
              <input
                type="number"
                name={`unidades_${v.id}`}
                min="0"
                defaultValue={0}
                className="mt-1 rounded-md border border-stone-300 px-3 py-2"
              />
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Activar este plan de producción"}
      </button>

      {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}
      {state && state.ok && (
        <p className="text-sm text-emerald-600">Plan de producción activado.</p>
      )}
    </form>
  );
}
