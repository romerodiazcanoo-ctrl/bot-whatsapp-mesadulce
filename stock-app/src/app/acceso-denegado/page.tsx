import { signOut } from "@/auth";

const MENSAJES: Record<string, { titulo: string; detalle: string }> = {
  "no-registrado": {
    titulo: "Tu cuenta todavía no tiene acceso",
    detalle:
      "Esta cuenta de Gmail no está registrada en el sistema. Pedile al administrador que te otorgue acceso desde el panel de usuarios.",
  },
  "sin-permiso": {
    titulo: "Tu acceso fue revocado o está pendiente",
    detalle:
      "El administrador todavía no habilitó (o revocó) el acceso de esta cuenta. Consultale para que lo active desde el panel de usuarios.",
  },
  "dispositivo-no-autorizado": {
    titulo: "Este dispositivo no está autorizado",
    detalle:
      "Tu cuenta ya está vinculada a otro dispositivo. Se avisó al administrador de este intento; pedile que reautorice este dispositivo desde el panel de usuarios para poder ingresar desde acá.",
  },
  "dispositivo-invalido": {
    titulo: "No pudimos identificar el dispositivo",
    detalle: "Volvé a intentar el inicio de sesión; si el problema persiste, avisá al administrador.",
  },
};

export default async function AccesoDenegadoPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;
  const info = MENSAJES[motivo ?? ""] ?? {
    titulo: "No se pudo iniciar sesión",
    detalle: "Ocurrió un problema al validar tu acceso. Contactá al administrador.",
  };

  async function cerrarSesion() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
        <p className="text-3xl">🔒</p>
        <h1 className="mt-3 text-lg font-semibold text-stone-900">{info.titulo}</h1>
        <p className="mt-2 text-sm text-stone-600">{info.detalle}</p>

        <form action={cerrarSesion} className="mt-6">
          <button
            type="submit"
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Cerrar sesión / probar con otra cuenta
          </button>
        </form>
      </div>
    </div>
  );
}
