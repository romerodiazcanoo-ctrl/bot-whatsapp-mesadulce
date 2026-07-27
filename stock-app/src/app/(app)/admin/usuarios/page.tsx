import { requireRole } from "@/lib/auth-guard";
import { getUsuarios } from "@/lib/queries";
import { crearUsuario, actualizarUsuario, reautorizarDispositivo, revocarAcceso } from "@/lib/actions/admin";

function formatFecha(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function UsuariosPage() {
  await requireRole("ADMIN");
  const usuarios = await getUsuarios();

  async function crear(formData: FormData) {
    "use server";
    await crearUsuario(formData);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Usuarios y accesos</h1>
        <p className="mt-1 text-sm text-stone-500">
          Otorgá acceso manualmente a cada cuenta de Gmail. El primer inicio de sesión de cada
          persona queda vinculado a ese dispositivo; para habilitar uno nuevo, reautorizalo acá.
        </p>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-stone-900">Otorgar acceso a una cuenta nueva</h2>
        <form action={crear} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-sm text-stone-600">
            Email de Gmail
            <input
              type="email"
              name="email"
              required
              placeholder="persona@gmail.com"
              className="mt-1 w-64 rounded-md border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col text-sm text-stone-600">
            Nombre (opcional)
            <input type="text" name="name" className="mt-1 w-48 rounded-md border border-stone-300 px-3 py-2" />
          </label>
          <label className="flex flex-col text-sm text-stone-600">
            Rol
            <select name="role" defaultValue="LECTOR" className="mt-1 rounded-md border border-stone-300 px-3 py-2">
              <option value="LECTOR">Solo lectura</option>
              <option value="EDITOR">Producción (puede cargar stock/plan)</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700"
          >
            Otorgar acceso
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-stone-900">Usuarios</h2>
        {usuarios.map((u) => {
          async function guardar(formData: FormData) {
            "use server";
            formData.set("userId", u.id);
            await actualizarUsuario(formData);
          }
          async function reautorizar() {
            "use server";
            await reautorizarDispositivo(u.id);
          }
          async function revocar() {
            "use server";
            await revocarAcceso(u.id);
          }

          return (
            <div key={u.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-stone-800">{u.name ?? u.email}</p>
                  <p className="text-sm text-stone-500">{u.email}</p>
                </div>

                <form action={guardar} className="flex flex-wrap items-center gap-3">
                  <select name="role" defaultValue={u.role} className="rounded-md border border-stone-300 px-2 py-1 text-sm">
                    <option value="LECTOR">Solo lectura</option>
                    <option value="EDITOR">Producción</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                  <label className="flex items-center gap-1 text-sm text-stone-600">
                    <input type="checkbox" name="isAuthorized" defaultChecked={u.isAuthorized} />
                    Autorizado
                  </label>
                  <button
                    type="submit"
                    className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-50"
                  >
                    Guardar
                  </button>
                </form>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-stone-500 sm:grid-cols-2">
                <p>
                  Dispositivo autorizado: {u.deviceLabel ?? "sin vincular"}
                  {u.deviceBoundAt ? ` · desde ${formatFecha(u.deviceBoundAt)}` : ""}
                </p>
                {u.pendingDeviceId && (
                  <p className="text-amber-700">
                    ⚠️ Pidió acceso desde otro dispositivo ({u.pendingDeviceLabel}) el{" "}
                    {formatFecha(u.pendingDeviceRequestedAt)}.
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(u.pendingDeviceId || u.deviceId) && (
                  <form action={reautorizar}>
                    <button
                      type="submit"
                      className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
                    >
                      {u.pendingDeviceId ? "Autorizar nuevo dispositivo" : "Liberar dispositivo vinculado"}
                    </button>
                  </form>
                )}
                {u.isAuthorized && (
                  <form action={revocar}>
                    <button
                      type="submit"
                      className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                    >
                      Revocar acceso
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
