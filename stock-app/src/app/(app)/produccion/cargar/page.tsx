import { requireRole } from "@/lib/auth-guard";
import { getVariedadesActivas } from "@/lib/queries";
import CargarProduccionForm from "./cargar-form";

export default async function CargarProduccionPage() {
  await requireRole("EDITOR");
  const variedades = await getVariedadesActivas();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Cargar producción</h1>
        <p className="mt-1 text-sm text-stone-500">
          Ingresá el peso total de masa producida y el sistema calcula automáticamente el
          rendimiento en unidades (peso ÷ peso unitario) y lo suma al stock crudo. Para brownies,
          cargá porciones sueltas y/o planchas producidas.
        </p>
      </div>

      <CargarProduccionForm
        variedades={variedades.map((v) => ({
          id: v.id,
          nombre: v.nombre,
          categoria: v.categoria,
          pesoUnitarioGramos: v.pesoUnitarioGramos,
        }))}
      />
    </div>
  );
}
