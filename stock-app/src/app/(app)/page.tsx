import Link from "next/link";
import { requireSession } from "@/lib/auth-guard";
import { getStockCompleto, getComparacionPlanActivo, getPlanActivo } from "@/lib/queries";

const PORCIONES_POR_PLANCHA = 12;

function formatNumber(n: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n);
}

export default async function DashboardPage() {
  await requireSession();

  const [stock, comparacion, plan] = await Promise.all([
    getStockCompleto(),
    getComparacionPlanActivo(),
    getPlanActivo(),
  ]);

  const cookiesClasicas = stock.filter((v) => v.categoria === "COOKIE_CLASICA");
  const cookiesRellenas = stock.filter((v) => v.categoria === "COOKIE_RELLENA");
  const brownies = stock.filter((v) => v.categoria === "BROWNIE");

  const alertas = comparacion.filter((c) => c.faltanteCrudo > 0);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-semibold text-stone-900">Panel de stock</h1>
        <p className="mt-1 text-sm text-stone-500">
          Vista general del stock crudo, horneado/congelado y de brownies, comparado contra el
          plan de producción activo.
        </p>
      </section>

      {plan ? (
        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-stone-900">
              Plan activo: {plan.nombre}
            </h2>
            <Link href="/produccion/plan" className="text-sm text-amber-700 hover:underline">
              Ver / editar plan →
            </Link>
          </div>

          {alertas.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {alertas.map((a) => (
                <li
                  key={a.varietyId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
                >
                  <span>
                    ⚠️ <strong>{a.nombre}</strong>: faltan{" "}
                    <strong>{formatNumber(a.faltanteCrudo)}</strong> unidades en crudo para cubrir
                    el plan ({formatNumber(a.unidadesObjetivo)} objetivo, {formatNumber(a.stockCrudo)} en
                    stock).
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              ✅ El stock crudo actual cubre todo el plan de producción activo.
            </p>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-stone-500">
                  <th className="py-1 pr-2 font-medium">Variedad</th>
                  <th className="py-1 pr-2 font-medium">Objetivo</th>
                  <th className="py-1 pr-2 font-medium">Stock crudo</th>
                  <th className="py-1 pr-2 font-medium">Falta producir</th>
                  <th className="py-1 pr-2 font-medium">Disp. para hornear</th>
                  <th className="py-1 pr-2 font-medium">Disp. para decorar</th>
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
                    <td className="py-1.5 pr-2">{formatNumber(c.disponibleParaHornear)}</td>
                    <td className="py-1.5 pr-2">
                      {c.disponibleParaDecorar === null ? "—" : formatNumber(c.disponibleParaDecorar)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-500">
          Todavía no hay un plan de producción activo.{" "}
          <Link href="/produccion/plan" className="text-amber-700 hover:underline">
            Cargar plan de producción →
          </Link>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-semibold text-stone-900">Stock crudo — Cookies clásicas</h2>
        <StockGrid items={cookiesClasicas.map((v) => ({ nombre: v.nombre, valor: v.crudo, unidad: "unidades" }))} />
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-stone-900">Cookies rellenas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cookiesRellenas.map((v) => (
            <div key={v.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="font-medium text-stone-800">{v.nombre}</p>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500">Crudo</dt>
                  <dd className="font-semibold">{formatNumber(v.crudo)} u.</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Horneado/congelado (listo para decorar)</dt>
                  <dd className="font-semibold">{formatNumber(v.horneadoCongelado)} u.</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-stone-900">Stock de brownies</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brownies.map((v) => (
            <div key={v.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="font-medium text-stone-800">{v.nombre}</p>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500">Porciones</dt>
                  <dd className="font-semibold">{formatNumber(v.brownieporciones)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Equivalente en planchas</dt>
                  <dd className="font-semibold">
                    {formatNumber(v.brownieporciones / PORCIONES_POR_PLANCHA)}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StockGrid({ items }: { items: { nombre: string; valor: number; unidad: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.nombre} className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">{item.nombre}</p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">
            {formatNumber(item.valor)}{" "}
            <span className="text-sm font-normal text-stone-500">{item.unidad}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
