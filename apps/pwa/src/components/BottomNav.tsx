import { NavLink } from "react-router-dom";
import { IconeBarras, IconeCalendario, IconeEstrela, IconeInicio, IconeTrofeu } from "./Icones";

const itens = [
  { to: "/", label: "Início", Icone: IconeInicio },
  { to: "/jogos", label: "Jogos", Icone: IconeCalendario },
  { to: "/classificacao", label: "Tabela", Icone: IconeBarras },
  { to: "/estatisticas", label: "Stats", Icone: IconeEstrela },
  { to: "/evento", label: "Torneio", Icone: IconeTrofeu },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto bg-cartao/95 backdrop-blur border-t border-borda rounded-t-3xl flex justify-around px-2 pt-3 pb-4">
        {itens.map(({ to, label, Icone }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[11px] font-medium px-2 ${isActive ? "text-destaque" : "text-cinza"}`
            }
          >
            <Icone tamanho={22} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
