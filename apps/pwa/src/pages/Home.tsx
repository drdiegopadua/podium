import { Link } from "react-router-dom";
import { PwaLayout } from "../components/PwaLayout";

const acessoRapido = [
  { label: "Jogos", to: "/jogos", icone: "📅" },
  { label: "Classificacao", to: "/classificacao", icone: "📊" },
  { label: "Perfil", to: "/perfil", icone: "👤" },
  { label: "Evento", to: "/evento", icone: "🏆" },
];

export function Home() {
  return (
    <PwaLayout>
      <div className="bg-ps-azul-escuro text-white rounded-b-3xl px-5 pt-8 pb-6">
        <div className="text-xl font-bold">
          <span className="text-ps-dourado">PODIUM</span>
        </div>
        <p className="text-sm text-ps-cinza mt-1">Tecnologia que conecta competicoes</p>
      </div>

      <div className="px-5 -mt-4">
        <div className="grid grid-cols-2 gap-3">
          {acessoRapido.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-3"
            >
              <span className="text-xl">{item.icone}</span>
              <span className="text-sm font-medium text-ps-azul-escuro">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </PwaLayout>
  );
}
