import { useEffect, useState } from "react";
import { REGRAS_PADRAO, classificacaoPorGrupo, type LinhaClassificacao } from "@arena/shared";
import { PwaLayout } from "../../components/PwaLayout";
import { EntrarTorneio } from "../../components/EntrarTorneio";
import { Escudo } from "../../components/Escudo";
import { supabase } from "../../lib/supabaseClient";
import { useTorneio } from "../../lib/torneio";
import { useJogos } from "../../lib/useJogos";

export function Classificacao() {
  const { torneio } = useTorneio();
  const { jogos } = useJogos(torneio?.id);
  const [linhas, setLinhas] = useState<LinhaClassificacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!torneio) return;
    const carregar = () =>
      supabase
        .from("classificacao")
        .select("*, equipe:equipes(nome, logo_url)")
        .eq("evento_id", torneio.id)
        .then(({ data }) => {
          setLinhas((data as LinhaClassificacao[]) ?? []);
          setCarregando(false);
        });
    carregar();
    const canal = supabase
      .channel(`classificacao-${torneio.id}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "classificacao", filter: `evento_id=eq.${torneio.id}` },
        () => carregar()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [torneio]);

  if (!torneio) {
    return (
      <PwaLayout>
        <div className="p-5 pt-10">
          <EntrarTorneio />
        </div>
      </PwaLayout>
    );
  }

  const regras = { ...REGRAS_PADRAO, ...(torneio.regras ?? {}) };
  const tabelas = classificacaoPorGrupo(linhas, regras.criterios_desempate, jogos);
  const zona =
    torneio.formato === "grupos_mata_mata"
      ? regras.classificados_por_grupo ?? 0
      : torneio.formato === "pontos_corridos_mata_mata"
        ? regras.classificados_playoff ?? 0
        : 1;
  const semJogos = jogos.length === 0;
  const mataMata = jogos.filter((j) => j.etapa === "mata_mata");

  return (
    <PwaLayout>
      <div className="px-5 pt-6 space-y-5">
        <h1 className="text-center text-lg font-semibold">Classificação</h1>
        {carregando && <p className="text-sm text-cinza">Carregando...</p>}
        {!carregando && semJogos && (
          <p className="rounded-2xl bg-cartao border border-borda p-4 text-sm text-cinza">
            A classificação aparece quando a tabela de jogos for divulgada.
          </p>
        )}

        {!semJogos &&
          tabelas.map((t) => (
            <section key={t.grupo} className="bg-cartao rounded-2xl border border-borda overflow-hidden">
              {t.grupo && <h2 className="px-4 pt-3 text-xs font-semibold uppercase text-cinza">Grupo {t.grupo}</h2>}
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-cinza">
                    <th className="text-left pl-4 py-2 font-medium">Equipe</th>
                    <th className="px-1.5 font-medium">P</th>
                    <th className="px-1.5 font-medium">J</th>
                    <th className="px-1.5 font-medium">V</th>
                    <th className="px-1.5 font-medium">E</th>
                    <th className="px-1.5 font-medium">D</th>
                    <th className="px-1.5 pr-4 font-medium">SG</th>
                  </tr>
                </thead>
                <tbody>
                  {t.linhas.map((l, i) => (
                    <tr key={l.id} className="border-t border-borda">
                      <td className="pl-4 py-2.5 max-w-0 w-full">
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-5 shrink-0 rounded text-center text-[11px] ${
                              i < zona ? "bg-destaque text-preto font-bold" : "text-cinza"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <Escudo nome={l.equipe?.nome} url={l.equipe?.logo_url} tamanho={24} />
                          <span className="truncate">{l.equipe?.nome}</span>
                        </span>
                      </td>
                      <td className="text-center font-bold text-destaque px-1.5">{l.pontos}</td>
                      <td className="text-center px-1.5">{l.jogos ?? 0}</td>
                      <td className="text-center px-1.5">{l.vitorias}</td>
                      <td className="text-center px-1.5">{l.empates ?? 0}</td>
                      <td className="text-center px-1.5">{l.derrotas}</td>
                      <td className="text-center px-1.5 pr-4">{l.saldo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}

        {!semJogos && zona > 0 && torneio.formato !== "pontos_corridos" && torneio.formato !== "pontos_corridos_ida_volta" && (
          <p className="flex items-center gap-2 text-xs text-cinza">
            <span className="w-3 h-3 rounded bg-destaque" /> Zona de classificação para o mata-mata
          </p>
        )}

        {mataMata.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-cinza">Mata-mata</h2>
            {Array.from(new Set(mataMata.map((j) => j.fase ?? ""))).map((fase) => (
              <div key={fase} className="rounded-2xl bg-cartao border border-borda p-3">
                <div className="text-xs text-cinza mb-2">{fase}</div>
                {mataMata
                  .filter((j) => (j.fase ?? "") === fase)
                  .map((j) => (
                    <div key={j.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                      <span className={`flex-1 truncate text-right ${j.vencedor_id === j.equipe_a_id && j.vencedor_id ? "font-bold" : ""}`}>
                        {j.equipe_a?.nome ?? "A definir"}
                      </span>
                      <span className="w-16 text-center font-extrabold tabular-nums">
                        {j.status === "encerrado" || j.status === "wo" || j.status === "em_andamento"
                          ? `${j.placar_a ?? 0} × ${j.placar_b ?? 0}`
                          : "×"}
                      </span>
                      <span className={`flex-1 truncate ${j.vencedor_id === j.equipe_b_id && j.vencedor_id ? "font-bold" : ""}`}>
                        {j.equipe_b?.nome ?? "A definir"}
                      </span>
                    </div>
                  ))}
              </div>
            ))}
          </section>
        )}
      </div>
    </PwaLayout>
  );
}
