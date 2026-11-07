import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { useEventosDaEmpresa } from "../../components/SeletorEvento";
import { FORMATOS_EVENTO } from "@arena/shared";

const URL_PWA = (import.meta.env.VITE_PWA_URL as string | undefined) ?? "https://podium-pwa.vercel.app";

export function ListaEventos() {
  const { eventos, carregando } = useEventosDaEmpresa();

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <PageHeader title="Torneios" subtitle="Campeonatos da sua empresa" />
        <Link
          to="/eventos/criar"
          className="rounded-lg bg-ps-dourado text-ps-azul-escuro font-semibold px-4 py-2 text-sm h-fit hover:brightness-95"
        >
          + Criar torneio
        </Link>
      </div>

      {carregando && <p className="text-sm text-slate-500">Carregando...</p>}

      {!carregando && eventos.length === 0 && (
        <p className="text-sm text-slate-500">Nenhum torneio criado ainda.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {eventos.map((evento) => (
          <div key={evento.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div className="text-xs uppercase tracking-wide text-ps-dourado font-semibold">
              {evento.status.replace(/_/g, " ")}
            </div>
            <div className="text-lg font-bold text-ps-azul-escuro mt-1">{evento.nome}</div>
            <div className="text-sm text-slate-500">
              {evento.cidade} · {new Date(evento.data_inicio + "T12:00").toLocaleDateString("pt-BR")}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {FORMATOS_EVENTO.find((f) => f.valor === evento.formato)?.rotulo} · {evento.qtd_equipes} equipes
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="font-mono bg-slate-100 rounded px-2 py-1">{evento.codigo_evento}</span>
              <a
                href={`${URL_PWA}/e/${evento.codigo_evento}`}
                target="_blank"
                rel="noreferrer"
                className="text-ps-azul-marinho underline"
              >
                Abrir no app
              </a>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
