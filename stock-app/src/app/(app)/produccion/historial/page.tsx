import Link from "next/link";
import { requireSession } from "@/lib/auth-guard";
import { getHistorialProduccion, getVariedades } from "@/lib/queries";
import { getProduccionSemanal, getProyeccionesPorVariedad } from "@/lib/analytics";
import HistorialCharts from "./historial-charts";

function formatNumber(n: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n);
}

function formatFecha(d: Date) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

const TENDENCIA_ICONO: Record<string, string> = {
  creciente: "📈",
  estable: "➡️",
  decreciente: "📉",
};

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ variedad?: string }>;
}) {
  await requireSession();
  const { variedad: varietyIdFiltro } = await searchParams;

  const [historial, variedades, semanas, proyecciones] = await Promise.all([
    getHistorialProduccion(),
    getVariedades(),
    getProduccionSemanal(),
    getProyeccionesPorVariedad(),
  ]);

  const historialFiltrado = varietyIdFiltro
    ? historial.filter((h) => h.varietyId === varietyIdFiltro)
    : historial;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Historial y proyecciones</h1>
        <p className="mt-1 text-sm text-stone-500">
          Producción cargada por semana, y una proyección simple en base al historial acumulado
          para anticipar necesidades de stock.
        </p>
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-stone-900">Producción total por semana (últimas 8)</h2>
        <HistorialCharts semanas={semanas} />
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-stone-900">Proyección por variedad</h2>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-stone-500">
                <th className="px-3 py-2 font-medium">Variedad</th>
                <th className="px-3 py-2 font-medium">Promedio semanal</th>
                <th className="px-3 py-2 font-medium">Tendencia</th>
                <th className="px-3 py-2 font-medium">Proyección próxima semana</th>
              </tr>
            </thead>
            <tbody>
              {proyecciones.map((p) => (
                <tr key={p.varietyId} className="border-t border-stone-100">
                  <td className="px-3 py-2 font-medium text-stone-800">{p.nombre}</td>
                  <td className="px-3 py-2">{formatNumber(p.promedioSemanal)}</td>
                  <td className="px-3 py-2">
                    {TENDENCIA_ICONO[p.tendencia]} {p.tendencia}
                  </td>
                  <td className="px-3 py-2">{formatNumber(p.proyeccionProximaSemana)}</td>
                </tr>
              ))}
              {proyecciones.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-stone-400">
                    Todavía no hay suficiente historial para proyectar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-stone-900">Historial de cargas de producción</h2>
          <div className="flex flex-wrap gap-1 text-sm">
            <Link
              href="/produccion/historial"
              className={`rounded-md px-2 py-1 ${!varietyIdFiltro ? "bg-amber-100 text-amber-900" : "text-stone-500 hover:bg-stone-100"}`}
            >
              Todas
            </Link>
            {variedades.map((v) => (
              <Link
                key={v.id}
                href={`/produccion/historial?variedad=${v.id}`}
                className={`rounded-md px-2 py-1 ${varietyIdFiltro === v.id ? "bg-amber-100 text-amber-900" : "text-stone-500 hover:bg-stone-100"}`}
              >
                {v.nombre}
              </Link>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-stone-500">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Variedad</th>
                <th className="px-3 py-2 font-medium">Peso de masa</th>
                <th className="px-3 py-2 font-medium">Unidades resultantes</th>
                <th className="px-3 py-2 font-medium">Cargado por</th>
              </tr>
            </thead>
            <tbody>
              {historialFiltrado.map((h) => (
                <tr key={h.id} className="border-t border-stone-100">
                  <td className="px-3 py-2">{formatFecha(h.fecha)}</td>
                  <td className="px-3 py-2 font-medium text-stone-800">{h.variety.nombre}</td>
                  <td className="px-3 py-2">{h.pesoMasaGramos ? `${formatNumber(h.pesoMasaGramos)} g` : "—"}</td>
                  <td className="px-3 py-2">{formatNumber(h.unidadesResultantes)}</td>
                  <td className="px-3 py-2 text-stone-500">{h.user?.name ?? h.user?.email ?? "—"}</td>
                </tr>
              ))}
              {historialFiltrado.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-stone-400">
                    Todavía no hay producción cargada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
