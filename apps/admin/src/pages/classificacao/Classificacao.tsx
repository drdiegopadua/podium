import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  REGRAS_PADRAO,
  classificacaoPorGrupo,
  type Evento,
  type Jogo,
  type Lance,
  type LinhaClassificacao,
} from "@arena/shared";
import { Layout } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { SeletorEvento, useEventoSelecionado } from "../../components/SeletorEvento";
import { supabase } from "../../lib/supabaseClient";
import { Escudo } from "../jogos-agenda/ModalResultado";

interface Ranking {
  nome: string;
  equipe: string;
  total: number;
}

function ranking(lances: (Lance & { equipe?: { nome: string } | null })[], tipos: string[]): Ranking[] {
  const mapa = new Map<string, Ranking>();
  for (const l of lances) {
    if (!tipos.includes(l.tipo) || !l.jogador_nome) continue;
    const k = `${l.equipe_id}|${l.jogador_nome.toLowerCase()}`;
    const atual = mapa.get(k) ?? { nome: l.jogador_nome, equipe: l.equipe?.nome ?? "", total: 0 };
    atual.total += l.quantidade;
    mapa.set(k, atual);
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));
}

export function Classificacao() {
  const { eventos, eventoId, setEventoId } = useEventoSelecionado();
  const evento = eventos.find((e) => e.id === eventoId) as Evento | undefined;
  const regras = { ...REGRAS_PADRAO, ...(evento?.regras ?? {}) };
  const [linhas, setLinhas] = useState<LinhaClassificacao[]>([]);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [lances, setLances] = useState<(Lance & { equipe?: { nome: string } | null })[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!eventoId) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    Promise.all([
      supabase.from("classificacao").select("*, equipe:equipes(nome, logo_url)").eq("evento_id", eventoId),
      supabase.from("jogos").select("*").eq("evento_id", eventoId),
      supabase.from("lances").select("*, equipe:equipes(nome)").eq("evento_id", eventoId),
    ]).then(([c, j, l]) => {
      setLinhas((c.data as LinhaClassificacao[]) ?? []);
      setJogos((j.data as Jogo[]) ?? []);
      setLances((l.data as typeof lances) ?? []);
      setCarregando(false);
    });
  }, [eventoId]);

  const tabelas = classificacaoPorGrupo(linhas, regras.criterios_desempate, jogos);
  const zona =
    evento?.formato === "grupos_mata_mata"
      ? regras.classificados_por_grupo ?? 0
      : evento?.formato === "pontos_corridos_mata_mata"
        ? regras.classificados_playoff ?? 0
        : 1;
  const artilharia = ranking(lances, ["gol"]).slice(0, 10);
  const amarelos = ranking(lances, ["amarelo"]);
  const vermelhos = ranking(lances, ["vermelho"]);

  return (
    <Layout>
      <PageHeader title="Classificação" subtitle="Atualizada automaticamente a cada resultado lançado" />
      <div className="mb-6">
        <SeletorEvento eventos={eventos} eventoId={eventoId} onChange={setEventoId} />
      </div>

      {carregando && <p className="text-sm text-cinza">Carregando...</p>}
      {!carregando && jogos.length === 0 && (
        <p className="text-sm text-cinza">
          Ainda não há jogos. Gere a tabela em{" "}
          <Link to="/jogos-agenda" className="text-destaque underline">
            Tabela de jogos
          </Link>
          .
        </p>
      )}

      <div className="grid xl:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          {jogos.length > 0 &&
            tabelas.map((t) => (
              <section key={t.grupo} className="bg-cartao rounded-2xl border border-borda overflow-x-auto">
                {t.grupo && <h2 className="px-5 pt-4 text-sm font-semibold">Grupo {t.grupo}</h2>}
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="text-xs text-cinza">
                      <th className="text-left px-5 py-3 font-medium">Equipe</th>
                      {["P", "J", "V", "E", "D", "GP", "GC", "SG"].map((h) => (
                        <th key={h} className="px-2 font-medium text-center">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.linhas.map((l, i) => (
                      <tr key={l.id} className="border-t border-borda">
                        <td className="px-5 py-2.5">
                          <span className="flex items-center gap-3">
                            <span
                              className={`w-5 text-xs text-center rounded ${i < zona ? "bg-destaque text-preto font-bold" : "text-cinza"}`}
                            >
                              {i + 1}
                            </span>
                            <Escudo equipe={l.equipe ? { id: l.equipe_id, ...l.equipe } : null} tamanho={24} />
                            <span className="font-medium">{l.equipe?.nome}</span>
                          </span>
                        </td>
                        <td className="text-center font-bold text-destaque">{l.pontos}</td>
                        <td className="text-center">{l.jogos ?? 0}</td>
                        <td className="text-center">{l.vitorias}</td>
                        <td className="text-center">{l.empates ?? 0}</td>
                        <td className="text-center">{l.derrotas}</td>
                        <td className="text-center">{l.gols_pro ?? 0}</td>
                        <td className="text-center">{l.gols_contra ?? 0}</td>
                        <td className="text-center">{l.saldo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
        </div>

        {jogos.length > 0 && (
          <aside className="space-y-4">
            <Lista titulo="⚽ Artilharia" itens={artilharia} vazio="Nenhum gol lançado." />
            <Lista titulo="🟨 Cartões amarelos" itens={amarelos.slice(0, 10)} vazio="Nenhum amarelo." />
            <Lista titulo="🟥 Cartões vermelhos" itens={vermelhos.slice(0, 10)} vazio="Nenhum vermelho." />
          </aside>
        )}
      </div>
    </Layout>
  );
}

function Lista({ titulo, itens, vazio }: { titulo: string; itens: Ranking[]; vazio: string }) {
  return (
    <section className="bg-cartao rounded-2xl border border-borda p-5">
      <h2 className="text-sm font-semibold mb-3">{titulo}</h2>
      {itens.length === 0 && <p className="text-xs text-cinza">{vazio}</p>}
      <ol className="space-y-2">
        {itens.map((r, i) => (
          <li key={`${r.nome}-${r.equipe}`} className="flex items-center justify-between text-sm gap-3">
            <span className="min-w-0">
              <span className="text-cinza mr-2">{i + 1}</span>
              <span className="font-medium">{r.nome}</span>
              <span className="block text-xs text-cinza truncate ml-5">{r.equipe}</span>
            </span>
            <span className="font-bold text-destaque tabular-nums">{r.total}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
