import { NavLink } from "react-router-dom";

const itens = [
  { to: "/", label: "Inicio", icone: "🏠" },
  { to: "/jogos", label: "Jogos", icone: "📅" },
  { to: "/classificacao", label: "Classificacao", icone: "📊" },
  { to: "/perfil", label: "Perfil", icone: "👤" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-ps-azul-marinho border-t border-white/10 flex justify-around py-2">
      {itens.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            `flex flex-col items-center text-xs gap-0.5 px-3 py-1 rounded-lg ${
              isActive ? "text-ps-dourado" : "text-ps-cinza"
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
