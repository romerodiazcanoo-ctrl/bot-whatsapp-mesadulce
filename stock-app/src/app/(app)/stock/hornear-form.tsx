"use client";

import { useActionState } from "react";
import { registrarHorneado, type ActionResult } from "@/lib/actions/stock";

async function submit(_prev: ActionResult | null, formData: FormData) {
  return registrarHorneado(formData);
}

export default function HornearForm({ varietyId, maxUnidades }: { varietyId: string; maxUnidades: number }) {
  const [state, formAction, pending] = useActionState(submit, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-lg bg-stone-50 p-3">
      <input type="hidden" name="varietyId" value={varietyId} />
      <label className="flex flex-col text-xs text-stone-500">
        Unidades a hornear (máx. {maxUnidades})
        <input
          type="number"
          name="unidades"
          step="1"
          min="0"
          max={maxUnidades}
          className="mt-1 w-28 rounded-md border border-stone-300 px-2 py-1 text-sm"
          required
        />
      </label>
      <button
        type="submit"
        disabled={pending || maxUnidades <= 0}
        className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-50"
      >
        {pending ? "Registrando…" : "Registrar horneado → congelado"}
      </button>
      {state && !state.ok && <p className="w-full text-xs text-red-600">{state.error}</p>}
      {state && state.ok && <p className="w-full text-xs text-emerald-600">Horneado registrado.</p>}
    </form>
  );
}
