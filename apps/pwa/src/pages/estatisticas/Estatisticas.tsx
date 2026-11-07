import { useState } from "react";
import { REGRAS_PADRAO } from "@arena/shared";
import { PwaLayout } from "../../components/PwaLayout";
import { EntrarTorneio } from "../../components/EntrarTorneio";
import { Escudo } from "../../components/Escudo";
import { useTorneio } from "../../lib/torneio";
import { useJogos } from "../../lib/useJogos";
import { ranking, situacaoDisciplinar, useLances, type ItemRanking, type SituacaoDisciplinar } from "../../lib/estatisticas";

type Aba = "gols" | "assistencias" | "cartoes" | "suspensos";

export function Estatisticas() {
  const { torneio } = useTorneio();
  const { lances, carregando } = useLances(torneio?.id);
  const { jogos } = useJogos(torneio?.id);
  const [aba, setAba] = useState<Aba>("gols");

  if (!torneio) {
    return (
      <PwaLayout>
        <div className="p-5 pt-10">
          <EntrarTorneio />
        </div>
      </PwaLayout>
    );
  }

  const limite = torneio.regras?.amarelos_suspensao ?? REGRAS_PADRAO.amarelos_suspensao ?? 3;
  const gols = ranking(lances, "gol");
  const assistencias = ranking(lances, "assistencia");
  const disciplina = situacaoDisciplinar(lances, jogos, limite);

  const abas: { id: Aba; rotulo: string }[] = [
    { id: "gols", rotulo: "Artilharia" },
    { id: "assistencias", rotulo: "Assist." },
    { id: "cartoes", rotulo: "Cartões" },
    { id: "suspensos", rotulo: "Suspensos" },
  ];

  return (
    <PwaLayout>
      <div className="px-5 pt-6 space-y-5">
        <h1 className="text-center text-lg font-semibold">Estatísticas</h1>
        <div className="flex rounded-full bg-cartao border border-borda p-1">
          {abas.map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex-1 rounded-full py-2 text-xs font-semibold ${aba === a.id ? "bg-destaque text-preto" : "text-cinza"}`}
            >
              {a.rotulo}
            </button>
          ))}
        </div>

        {carregando && <p className="text-sm text-cinza">Carregando...</p>}

        {aba === "gols" && <Lista itens={gols} sufixo="gol" vazio="Nenhum gol marcado ainda." destaqueTopo />}
        {aba === "assistencias" && <Lista itens={assistencias} sufixo="assist." vazio="Nenhuma assistência lançada." />}
        {aba === "cartoes" &&
          (disciplina.cartoes.length === 0 ? (
            <Vazio texto="Nenhum cartão até agora. Jogo limpo!" />
          ) : (
            <ul className="space-y-2">
              {disciplina.cartoes.map((s) => (
                <Linha key={s.chave} item={s}>
                  <span className="flex items-center gap-2 text-sm font-bold tabular-nums">
                    {s.amarelos > 0 && <span>🟨 {s.amarelos}</span>}
                    {s.vermelhos > 0 && <span>🟥 {s.vermelhos}</span>}
                  </span>
                </Linha>
              ))}
            </ul>
          ))}
        {aba === "suspensos" && (
          <div className="space-y-5">
            <Bloco titulo="Suspensos para o próximo jogo" itens={disciplina.suspensos} vazio="Ninguém suspenso." cor="text-ps-vermelho" />
            {limite > 1 && (
              <Bloco
                titulo={`Pendurados (próximo amarelo suspende)`}
                itens={disciplina.pendurados}
                vazio="Ninguém pendurado."
                cor="text-destaque"
              />
            )}
            <p className="text-xs text-cinza">
              Regra do torneio: {limite > 0 ? `${limite} amarelos ou 1 vermelho suspendem por 1 jogo.` : "1 vermelho suspende por 1 jogo."}
            </p>
          </div>
        )}
      </div>
    </PwaLayout>
  );
}

function Lista({
  itens,
  sufixo,
  vazio,
  destaqueTopo = false,
}: {
  itens: ItemRanking[];
  sufixo: string;
  vazio: string;
  destaqueTopo?: boolean;
}) {
  if (itens.length === 0) return <Vazio texto={vazio} />;
  return (
    <ol className="space-y-2">
      {itens.map((it, i) => (
        <Linha key={it.chave} item={it} posicao={i + 1} destaque={destaqueTopo && i === 0}>
          <span className="text-right">
            <span className="text-xl font-extrabold tabular-nums text-destaque">{it.total}</span>
            <span className="block text-[10px] text-cinza">
              {sufixo}
              {it.total > 1 && sufixo === "gol" ? "s" : ""}
            </span>
          </span>
        </Linha>
      ))}
    </ol>
  );
}

function Linha({
  item,
  posicao,
  destaque = false,
  children,
}: {
  item: ItemRanking;
  posicao?: number;
  destaque?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border p-3 ${
        destaque ? "bg-destaque text-preto border-destaque" : "bg-cartao border-borda"
      }`}
    >
      {posicao != null && (
        <span className={`w-5 text-center text-sm font-bold ${destaque ? "" : "text-cinza"}`}>{posicao}</span>
      )}
      <Escudo nome={item.equipe} url={item.logo} tamanho={32} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold truncate">{item.nome}</span>
        <span className={`block text-xs truncate ${destaque ? "opacity-70" : "text-cinza"}`}>{item.equipe}</span>
      </span>
      {children}
    </li>
  );
}

function Bloco({ titulo, itens, vazio, cor }: { titulo: string; itens: SituacaoDisciplinar[]; vazio: string; cor: string }) {
  return (
    <section>
      <h2 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${cor}`}>{titulo}</h2>
      {itens.length === 0 ? (
        <Vazio texto={vazio} />
      ) : (
        <ul className="space-y-2">
          {itens.map((s) => (
            <Linha key={s.chave} item={s}>
              <span className="text-xs text-cinza text-right">{s.motivo}</span>
            </Linha>
          ))}
        </ul>
      )}
    </section>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="rounded-2xl bg-cartao border border-borda p-4 text-sm text-cinza">{texto}</p>;
}
