"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";

const LINKS: { href: string; label: string; minRole: Role }[] = [
  { href: "/", label: "Panel", minRole: "LECTOR" },
  { href: "/stock", label: "Stock", minRole: "LECTOR" },
  { href: "/produccion/cargar", label: "Cargar producción", minRole: "EDITOR" },
  { href: "/produccion/plan", label: "Plan de producción", minRole: "LECTOR" },
  { href: "/produccion/historial", label: "Historial", minRole: "LECTOR" },
  { href: "/admin/usuarios", label: "Usuarios", minRole: "ADMIN" },
  { href: "/admin/variedades", label: "Variedades", minRole: "ADMIN" },
  { href: "/ayuda", label: "Ayuda", minRole: "LECTOR" },
];

const RANK: Record<Role, number> = { LECTOR: 0, EDITOR: 1, ADMIN: 2 };

export default function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-wrap gap-1 text-sm">
      {LINKS.filter((l) => RANK[role] >= RANK[l.minRole]).map((link) => {
        const active = pathname === link.href;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`block rounded-md px-3 py-1.5 font-medium transition ${
                active ? "bg-amber-100 text-amber-900" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
