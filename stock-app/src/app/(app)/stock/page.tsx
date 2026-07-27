import { requireSession, canEdit } from "@/lib/auth-guard";
import { getStockCompleto } from "@/lib/queries";
import AjusteForm from "./ajuste-form";
import HornearForm from "./hornear-form";

function formatNumber(n: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n);
}

export default async function StockPage() {
  const session = await requireSession();
  const editable = canEdit(session.user.role);
  const stock = await getStockCompleto();

  const cookiesClasicas = stock.filter((v) => v.categoria === "COOKIE_CLASICA");
  const cookiesRellenas = stock.filter((v) => v.categoria === "COOKIE_RELLENA");
  const brownies = stock.filter((v) => v.categoria === "BROWNIE");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Stock</h1>
        <p className="mt-1 text-sm text-stone-500">
          Cargá o corregí manualmente el stock real de cada etapa. Usalo para el inventario
          inicial y para ajustes puntuales (conteos físicos, mermas, etc.).
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-stone-900">Cookies clásicas — crudo</h2>
        {cookiesClasicas.map((v) => (
          <div key={v.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-stone-800">{v.nombre}</p>
              <p className="text-sm text-stone-500">
                Stock actual: <strong>{formatNumber(v.crudo)}</strong> unidades
              </p>
            </div>
            {editable && (
              <div className="mt-3">
                <AjusteForm varietyId={v.id} etapa="CRUDO" cantidadActual={v.crudo} unidad="unidades" />
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-stone-900">Cookies rellenas — crudo y horneado/congelado</h2>
        {cookiesRellenas.map((v) => (
          <div key={v.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="font-medium text-stone-800">{v.nombre}</p>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-stone-500">
                  Crudo: <strong>{formatNumber(v.crudo)}</strong> unidades
                </p>
                {editable && (
                  <div className="mt-2">
                    <AjusteForm varietyId={v.id} etapa="CRUDO" cantidadActual={v.crudo} unidad="unidades" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-stone-500">
                  Horneado/congelado (listo para decorar):{" "}
                  <strong>{formatNumber(v.horneadoCongelado)}</strong> unidades
                </p>
                {editable && (
                  <div className="mt-2">
                    <AjusteForm
                      varietyId={v.id}
                      etapa="HORNEADO_CONGELADO"
                      cantidadActual={v.horneadoCongelado}
                      unidad="unidades"
                    />
                  </div>
                )}
              </div>
            </div>
            {editable && (
              <div className="mt-3">
                <HornearForm varietyId={v.id} maxUnidades={v.crudo} />
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-stone-900">Brownies — porciones</h2>
        {brownies.map((v) => (
          <div key={v.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-stone-800">{v.nombre}</p>
              <p className="text-sm text-stone-500">
                Stock actual: <strong>{formatNumber(v.brownieporciones)}</strong> porciones (
                {formatNumber(v.brownieporciones / 12)} planchas)
              </p>
            </div>
            {editable && (
              <div className="mt-3">
                <AjusteForm
                  varietyId={v.id}
                  etapa="BROWNIE_PORCIONES"
                  cantidadActual={v.brownieporciones}
                  unidad="porciones"
                />
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
