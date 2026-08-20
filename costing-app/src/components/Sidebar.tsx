import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/insumos', label: 'Insumos', icon: '🧺' },
  { to: '/preparaciones', label: 'Preparaciones', icon: '🥣' },
  { to: '/recetas', label: 'Recetas', icon: '📖' },
  { to: '/productos', label: 'Productos', icon: '🍪' },
  { to: '/lista-precios', label: 'Lista de precios', icon: '💲' },
];

export function Sidebar() {
  return (
    <aside className="no-print w-60 shrink-0 bg-bordo-700 text-manteca-100 flex flex-col min-h-screen">
      <div className="px-6 py-6">
        <h1 className="font-display text-2xl font-semibold text-white">Mesa Dulce</h1>
        <p className="text-celeste-300 text-sm">Costeo &amp; carta</p>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-bordo-800 text-white' : 'text-manteca-100/80 hover:bg-bordo-600'
              }`
            }
          >
            <span>{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 text-xs text-celeste-300/70">Uso local — sin nube</div>
    </aside>
  );
}
