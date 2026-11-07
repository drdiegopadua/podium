import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CRITERIOS_DESEMPATE, FORMATOS_EVENTO } from "@arena/shared";
import { PwaLayout } from "../../components/PwaLayout";
import { EntrarTorneio } from "../../components/EntrarTorneio";
import { useTorneio } from "../../lib/torneio";

export function InfoEvento() {
  const { codigoEvento } = useParams();
  const navigate = useNavigate();
  const { torneio, carregando, abrir, esquecer } = useTorneio();

  // Link/QR Code: /e/CODIGO abre o torneio e leva para a tela inicial dele
  useEffect(() => {
    if (!codigoEvento) return;
    abrir(codigoEvento).then((ok) => navigate(ok ? "/" : "/evento", { replace: true }));
  }, [codigoEvento, abrir, navigate]);

  if (codigoEvento || carregando) {
    return (
      <PwaLayout>
        <p className="p-8 text-center text-sm text-cinza">Abrindo torneio...</p>
      </PwaLayout>
    );
  }

  if (!torneio) {
    return (
      <PwaLayout>
        <div className="p-5">
          <EntrarTorneio />
        </div>
      </PwaLayout>
    );
  }

  const r = torneio.regras ?? {};
  const data = (d?: string | null) => (d ? new Date(d + "T12:00").toLocaleDateString("pt-BR") : "—");

  return (
    <PwaLayout>
      <div className="p-5 space-y-4">
        <h1 className="text-lg font-bold text-white">{torneio.nome}</h1>
        {torneio.descricao && <p className="text-sm text-white/80">{torneio.descricao}</p>}

        <Cartao titulo="Informações">
          <Linha rotulo="Organização" valor={torneio.empresa?.nome} />
          <Linha rotulo="Esporte" valor={torneio.esporte?.nome} />
          <Linha rotulo="Formato" valor={FORMATOS_EVENTO.find((f) => f.valor === torneio.formato)?.rotulo} />
          <Linha rotulo="Equipes" valor={String(torneio.qtd_equipes)} />
          <Linha rotulo="Cidade" valor={torneio.cidade} />
          {torneio.locais?.length > 0 && <Linha rotulo="Locais" valor={torneio.locais.join(", ")} />}
          <Linha rotulo="Período" valor={`${data(torneio.data_inicio)} a ${data(torneio.data_fim)}`} />
        </Cartao>

        <Cartao titulo="Pontuação">
          <Linha rotulo="Vitória" valor={`${r.pontos_vitoria ?? 3} pts`} />
          {r.permite_empate !== false && <Linha rotulo="Empate" valor={`${r.pontos_empate ?? 1} pts`} />}
          <Linha rotulo="Derrota" valor={`${r.pontos_derrota ?? 0} pts`} />
          <Linha rotulo="W.O." valor={`${r.pontos_wo ?? 0} pts`} />
          {r.qtd_grupos ? (
            <Linha rotulo="Grupos" valor={`${r.qtd_grupos} (${r.classificados_por_grupo} classificam)`} />
          ) : null}
          {r.classificados_playoff ? <Linha rotulo="Playoffs" valor={`${r.classificados_playoff} melhores`} /> : null}
          {r.criterios_desempate && r.criterios_desempate.length > 0 && (
            <div className="pt-2 text-xs text-cinza">
              Desempate:{" "}
              {r.criterios_desempate
                .map((c, i) => `${i + 1}º ${CRITERIOS_DESEMPATE.find((x) => x.valor === c)?.rotulo ?? c}`)
                .join(" · ")}
            </div>
          )}
        </Cartao>

        {r.observacoes && (
          <Cartao titulo="Regulamento">
            <p className="text-sm text-white/80 whitespace-pre-line">{r.observacoes}</p>
          </Cartao>
        )}

        {torneio.empresa?.slug && (
          <Link
            to={`/o/${torneio.empresa.slug}`}
            className="block rounded-2xl bg-cartao border border-borda p-4 text-sm font-semibold"
          >
            Ver todos os campeonatos de {torneio.empresa.nome} ›
          </Link>
        )}

        <button
          onClick={() => {
            esquecer();
            navigate("/");
          }}
          className="w-full rounded-full border border-borda py-3 text-sm font-semibold"
        >
          Trocar de campeonato
        </button>

        <p className="text-center text-xs text-cinza">
          Código do torneio: <span className="font-mono">{torneio.codigo_evento}</span>
        </p>
      </div>
    </PwaLayout>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="bg-cartao rounded-2xl shadow-sm border border-borda p-4">
      <h2 className="text-sm font-bold text-white mb-2">{titulo}</h2>
      <div className="divide-y divide-borda">{children}</div>
    </section>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-cinza">{rotulo}</span>
      <span className="text-right font-medium text-white">{valor || "—"}</span>
    </div>
  );
}
