import Link from "next/link";
import { requireSession } from "@/lib/auth-guard";
import { signOut } from "@/auth";
import NavLinks from "./nav-links";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  async function cerrarSesion() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold text-stone-900">
            <span className="text-xl">🧁</span>
            <span>Mesa Dulce — Control de Stock</span>
          </Link>
          <div className="flex items-center gap-3 text-sm text-stone-600">
            <span className="hidden sm:inline">
              {session.user.name ?? session.user.email} · {ROLE_LABEL[session.user.role]}
            </span>
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-50"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl px-4 pb-3">
          <NavLinks role={session.user.role} />
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  EDITOR: "Producción",
  LECTOR: "Solo lectura",
};
