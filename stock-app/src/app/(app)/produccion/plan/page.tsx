import { requireSession, canEdit } from "@/lib/auth-guard";
import { getPlanActivo, getComparacionPlanActivo, getVariedadesActivas, getPlanesHistoricos } from "@/lib/queries";
import PlanForm from "./plan-form";

function formatNumber(n: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n);
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export default async function PlanProduccionPage() {
  const session = await requireSession();
  const editable = canEdit(session.user.role);

  const [plan, comparacion, variedades, historicos] = await Promise.all([
    getPlanActivo(),
    getComparacionPlanActivo(),
    getVariedadesActivas(),
    getPlanesHistoricos(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Plan de producción</h1>
        <p className="mt-1 text-sm text-stone-500">
          Cargá cuánto hay que producir por variedad. El sistema lo compara automáticamente
          contra el stock crudo disponible.
        </p>
      </div>

      {plan && (
        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="font-semibold text-stone-900">
            Plan activo: {plan.nombre} ({formatDate(plan.fechaInicio)} — {formatDate(plan.fechaFin)})
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-stone-500">
                  <th className="py-1 pr-2 font-medium">Variedad</th>
                  <th className="py-1 pr-2 font-medium">Objetivo</th>
                  <th className="py-1 pr-2 font-medium">Stock crudo</th>
                  <th className="py-1 pr-2 font-medium">Falta producir</th>
                </tr>
              </thead>
              <tbody>
                {comparacion.map((c) => (
                  <tr key={c.varietyId} className="border-t border-stone-100">
                    <td className="py-1.5 pr-2 font-medium text-stone-800">{c.nombre}</td>
                    <td className="py-1.5 pr-2">{formatNumber(c.unidadesObjetivo)}</td>
                    <td className="py-1.5 pr-2">{formatNumber(c.stockCrudo)}</td>
                    <td className={`py-1.5 pr-2 ${c.faltanteCrudo > 0 ? "font-semibold text-red-700" : ""}`}>
                      {formatNumber(c.faltanteCrudo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {editable ? (
        <section>
          <h2 className="mb-3 font-semibold text-stone-900">
            {plan ? "Cargar un nuevo plan (reemplaza al activo)" : "Cargar plan de producción"}
          </h2>
          <PlanForm variedades={variedades.map((v) => ({ id: v.id, nombre: v.nombre, categoria: v.categoria }))} />
        </section>
      ) : (
        <p className="text-sm text-stone-500">
          Tu perfil tiene acceso de solo lectura: podés ver el plan, pero no cargar uno nuevo.
        </p>
      )}

      {historicos.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-stone-900">Planes anteriores</h2>
          <ul className="flex flex-col gap-2">
            {historicos.map((p) => (
              <li key={p.id} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm">
                <span className="font-medium text-stone-800">{p.nombre}</span>{" "}
                <span className="text-stone-500">
                  ({formatDate(p.fechaInicio)} — {formatDate(p.fechaFin)}) · {p.items.length} variedades
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
