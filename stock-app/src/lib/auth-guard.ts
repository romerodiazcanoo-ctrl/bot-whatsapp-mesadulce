import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/enums";

const ROLE_RANK: Record<Role, number> = { LECTOR: 0, EDITOR: 1, ADMIN: 2 };

/** Para usar en Server Components: exige sesión válida o redirige. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user || !session.user.isAuthorized) {
    redirect("/login");
  }
  return session;
}

/** Para usar en Server Components: exige un rol mínimo o redirige al panel. */
export async function requireRole(minRole: Role) {
  const session = await requireSession();
  if (ROLE_RANK[session.user.role] < ROLE_RANK[minRole]) {
    redirect("/?error=permiso-insuficiente");
  }
  return session;
}

/** Para usar en Server Actions: nunca redirige, devuelve null si no corresponde. */
export async function getActionSession(minRole: Role = "LECTOR") {
  const session = await auth();
  if (!session?.user || !session.user.isAuthorized) return null;
  if (ROLE_RANK[session.user.role] < ROLE_RANK[minRole]) return null;
  return session;
}

export function canEdit(role: Role) {
  return ROLE_RANK[role] >= ROLE_RANK.EDITOR;
}

export function isAdmin(role: Role) {
  return role === "ADMIN";
}
