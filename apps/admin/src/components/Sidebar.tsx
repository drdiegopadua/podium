import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/eventos", label: "Eventos" },
  { to: "/equipes", label: "Equipes" },
  { to: "/atletas", label: "Atletas" },
  { to: "/jogos-agenda", label: "Jogos & Agenda" },
  { to: "/sumulas", label: "Sumulas" },
  { to: "/classificacao", label: "Classificacao" },
];

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-ps-azul-escuro text-ps-branco min-h-screen flex flex-col">
      <div className="px-6 py-8 border-b border-white/10">
        <div className="text-xl font-bold tracking-wide">
          PADUA <span className="text-ps-dourado">SPORTS</span>
        </div>
        <div className="text-xs text-ps-cinza mt-1">Painel Admin</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `block rounded-lg px-4 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-ps-dourado text-ps-azul-escuro font-semibold"
                  : "text-ps-cinza hover:bg-ps-azul-marinho hover:text-ps-branco"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
