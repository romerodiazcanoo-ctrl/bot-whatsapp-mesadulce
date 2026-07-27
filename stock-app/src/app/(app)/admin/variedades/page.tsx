import { requireRole } from "@/lib/auth-guard";
import { getVariedades } from "@/lib/queries";
import { crearVariedad, actualizarVariedad } from "@/lib/actions/admin";

const CATEGORIA_LABEL: Record<string, string> = {
  COOKIE_CLASICA: "Cookie clásica",
  COOKIE_RELLENA: "Cookie rellena",
  BROWNIE: "Brownie",
};

export default async function VariedadesPage() {
  await requireRole("ADMIN");
  const variedades = await getVariedades();

  async function crear(formData: FormData) {
    "use server";
    await crearVariedad(formData);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Variedades de producto</h1>
        <p className="mt-1 text-sm text-stone-500">
          Agregá nuevas variedades de cookies o brownies, con su peso unitario de referencia (no
          aplica a brownies, que se gestionan por porción/plancha).
        </p>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-stone-900">Agregar variedad</h2>
        <form action={crear} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-sm text-stone-600">
            Nombre
            <input
              type="text"
              name="nombre"
              required
              placeholder="Ej: Cookie matcha"
              className="mt-1 w-56 rounded-md border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col text-sm text-stone-600">
            Categoría
            <select name="categoria" defaultValue="COOKIE_CLASICA" className="mt-1 rounded-md border border-stone-300 px-3 py-2">
              <option value="COOKIE_CLASICA">Cookie clásica</option>
              <option value="COOKIE_RELLENA">Cookie rellena</option>
              <option value="BROWNIE">Brownie</option>
            </select>
          </label>
          <label className="flex flex-col text-sm text-stone-600">
            Peso unitario (g)
            <input
              type="number"
              name="pesoUnitarioGramos"
              min="1"
              placeholder="Ej: 40"
              className="mt-1 w-32 rounded-md border border-stone-300 px-3 py-2"
            />
          </label>
          <button type="submit" className="rounded-md bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700">
            Agregar
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-stone-900">Variedades existentes</h2>
        {variedades.map((v) => {
          async function guardar(formData: FormData) {
            "use server";
            formData.set("varietyId", v.id);
            await actualizarVariedad(formData);
          }

          return (
            <form
              key={v.id}
              action={guardar}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4"
            >
              <div>
                <p className="font-medium text-stone-800">{v.nombre}</p>
                <p className="text-sm text-stone-500">{CATEGORIA_LABEL[v.categoria]}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {v.categoria !== "BROWNIE" && (
                  <label className="flex items-center gap-2 text-sm text-stone-600">
                    Peso unitario (g)
                    <input
                      type="number"
                      name="pesoUnitarioGramos"
                      min="1"
                      defaultValue={v.pesoUnitarioGramos ?? undefined}
                      className="w-24 rounded-md border border-stone-300 px-2 py-1"
                    />
                  </label>
                )}
                <label className="flex items-center gap-1 text-sm text-stone-600">
                  <input type="checkbox" name="activa" defaultChecked={v.activa} />
                  Activa
                </label>
                <button
                  type="submit"
                  className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-50"
                >
                  Guardar
                </button>
              </div>
            </form>
          );
        })}
      </section>
    </div>
  );
}
