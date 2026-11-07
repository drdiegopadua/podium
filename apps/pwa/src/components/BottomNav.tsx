import { NavLink } from "react-router-dom";

const itens = [
  { to: "/", label: "Início", icone: "🏠" },
  { to: "/jogos", label: "Jogos", icone: "📅" },
  { to: "/classificacao", label: "Tabela", icone: "📊" },
  { to: "/evento", label: "Torneio", icone: "🏆" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-primaria border-t border-white/10 flex justify-around py-2">
      {itens.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            `flex flex-col items-center text-xs gap-0.5 px-3 py-1 rounded-lg ${
              isActive ? "text-destaque" : "text-white/60"
            }`
          }
        >
          <span className="text-lg leading-none">{item.icone}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
