"use client";

import { useActionState } from "react";
import { ajustarStock, type ActionResult } from "@/lib/actions/stock";
import type { Etapa } from "@/generated/prisma/enums";

async function submit(_prev: ActionResult | null, formData: FormData) {
  return ajustarStock(formData);
}

export default function AjusteForm({
  varietyId,
  etapa,
  cantidadActual,
  unidad,
}: {
  varietyId: string;
  etapa: Etapa;
  cantidadActual: number;
  unidad: string;
}) {
  const [state, formAction, pending] = useActionState(submit, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="varietyId" value={varietyId} />
      <input type="hidden" name="etapa" value={etapa} />
      <label className="flex flex-col text-xs text-stone-500">
        Nueva cantidad ({unidad})
        <input
          type="number"
          name="nuevaCantidad"
          step="0.01"
          min="0"
          defaultValue={cantidadActual}
          className="mt-1 w-28 rounded-md border border-stone-300 px-2 py-1 text-sm"
          required
        />
      </label>
      <label className="flex flex-col text-xs text-stone-500">
        Motivo (opcional)
        <input
          type="text"
          name="nota"
          placeholder="Ej: conteo físico"
          className="mt-1 w-40 rounded-md border border-stone-300 px-2 py-1 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Ajustar"}
      </button>
      {state && !state.ok && <p className="w-full text-xs text-red-600">{state.error}</p>}
      {state && state.ok && <p className="w-full text-xs text-emerald-600">Stock actualizado.</p>}
    </form>
  );
}
