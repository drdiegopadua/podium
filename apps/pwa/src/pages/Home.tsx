import { Link } from "react-router-dom";
import { FORMATOS_EVENTO } from "@arena/shared";
import { PwaLayout } from "../components/PwaLayout";
import { EntrarTorneio } from "../components/EntrarTorneio";
import { useTorneio } from "../lib/torneio";

const acessoRapido = [
  { label: "Jogos", to: "/jogos", icone: "📅" },
  { label: "Classificação", to: "/classificacao", icone: "📊" },
  { label: "Regulamento", to: "/evento", icone: "📜" },
  { label: "Sou atleta", to: "/login", icone: "👤" },
];

export function Home() {
  const { torneio, carregando, esquecer } = useTorneio();

  return (
    <PwaLayout>
      <div className="bg-primaria text-white rounded-b-3xl px-5 pt-8 pb-8">
        {torneio ? (
          <div className="flex items-center gap-4">
            {(torneio.logo_url || torneio.empresa?.logo_url) && (
              <img
                src={torneio.logo_url ?? torneio.empresa?.logo_url ?? ""}
                alt=""
                className="w-14 h-14 rounded-xl bg-white object-contain p-1"
              />
            )}
            <div className="min-w-0">
              <div className="text-xs text-white/70 truncate">{torneio.empresa?.nome}</div>
              <h1 className="text-xl font-bold leading-tight">{torneio.nome}</h1>
              <div className="text-xs text-destaque mt-0.5">
                {torneio.esporte?.nome} · {FORMATOS_EVENTO.find((f) => f.valor === torneio.formato)?.rotulo}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="text-xl font-bold">
              <span className="text-destaque">ARENA</span> SPORTS
            </div>
            <p className="text-sm text-white/70 mt-1">Seu torneio na palma da mão</p>
          </>
        )}
      </div>

      <div className="px-5 -mt-4 space-y-4">
        {carregando && <p className="text-sm text-slate-500 pt-6 text-center">Carregando...</p>}

        {!carregando && !torneio && <EntrarTorneio />}

        {torneio && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {acessoRapido.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-3"
                >
                  <span className="text-xl">{item.icone}</span>
                  <span className="text-sm font-medium text-primaria">{item.label}</span>
                </Link>
              ))}
            </div>
            <button onClick={esquecer} className="w-full text-xs text-slate-500 underline">
              Trocar de torneio
            </button>
          </>
        )}
      </div>
    </PwaLayout>
  );
}
