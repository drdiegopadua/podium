import { NavLink } from "react-router-dom";
import { useSessao } from "../contexts/SessaoContext";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/eventos", label: "Torneios" },
  { to: "/equipes", label: "Equipes" },
  { to: "/atletas", label: "Atletas" },
  { to: "/jogos-agenda", label: "Jogos & Agenda" },
  { to: "/sumulas", label: "Súmulas" },
  { to: "/classificacao", label: "Classificação" },
  { to: "/empresa", label: "Minha empresa" },
];

const PAPEIS: Record<string, string> = {
  dono: "Proprietário",
  admin: "Administrador",
  gestor: "Gestor",
  arbitro: "Árbitro",
};

export function Sidebar() {
  const { perfil, sessao, vinculos, empresaAtual, papelAtual, trocarEmpresa, sair } = useSessao();

  return (
    <aside className="w-64 shrink-0 bg-ps-azul-escuro text-ps-branco min-h-screen flex flex-col">
      <div className="px-6 py-6 border-b border-white/10">
        <div className="text-xl font-bold tracking-wide">
          <span className="text-ps-dourado">ARENA</span> SPORTS
        </div>
        {vinculos.length > 1 ? (
          <select
            value={empresaAtual?.id ?? ""}
            onChange={(e) => trocarEmpresa(e.target.value)}
            className="mt-3 w-full rounded-md bg-ps-azul-marinho text-sm px-2 py-1.5 border border-white/10"
          >
            {vinculos.map((v) => (
              <option key={v.empresa.id} value={v.empresa.id}>
                {v.empresa.nome}
              </option>
            ))}
          </select>
        ) : (
          <div className="mt-3 text-sm font-semibold truncate">{empresaAtual?.nome}</div>
        )}
        {papelAtual && <div className="text-xs text-ps-cinza mt-0.5">{PAPEIS[papelAtual]}</div>}
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
      <div className="px-6 py-4 border-t border-white/10 text-xs">
        <div className="truncate text-ps-branco">{perfil?.nome ?? sessao?.user.email}</div>
        <button onClick={sair} className="mt-1 text-ps-cinza underline hover:text-white">
          Sair
        </button>
      </div>
    </aside>
  );
}
