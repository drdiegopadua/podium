import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Lance } from "@arena/shared";
import { PwaLayout } from "../../components/PwaLayout";
import { Escudo } from "../../components/Escudo";
import { IconeVoltar } from "../../components/Icones";
import { supabase } from "../../lib/supabaseClient";
import type { JogoComEquipes } from "../../lib/useJogos";

const ICONE: Record<Lance["tipo"], string> = {
  gol: "⚽",
  gol_contra: "🥅",
  assistencia: "👟",
  amarelo: "🟨",
  vermelho: "🟥",
};
const ROTULO: Record<Lance["tipo"], string> = {
  gol: "Gol",
  gol_contra: "Gol contra",
  assistencia: "Assistência",
  amarelo: "Amarelo",
  vermelho: "Vermelho",
};

export function JogoDetalhe() {
  const { jogoId } = useParams();
  const [jogo, setJogo] = useState<JogoComEquipes | null>(null);
  const [lances, setLances] = useState<Lance[]>([]);
  const [naoAchou, setNaoAchou] = useState(false);

  useEffect(() => {
    if (!jogoId) return;
    const carregar = async () => {
      const [{ data: j }, { data: l }] = await Promise.all([
        supabase
          .from("jogos")
          .select(
            "*, equipe_a:equipes!jogos_equipe_a_id_fkey(nome, logo_url), equipe_b:equipes!jogos_equipe_b_id_fkey(nome, logo_url)"
          )
          .eq("id", jogoId)
          .maybeSingle(),
        supabase.from("lances").select("*").eq("jogo_id", jogoId).order("criado_em"),
      ]);
      if (!j) setNaoAchou(true);
      setJogo(j as JogoComEquipes);
      setLances((l as Lance[]) ?? []);
    };
    carregar();
    const canal = supabase
      .channel(`jogo-${jogoId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "jogos", filter: `id=eq.${jogoId}` }, carregar)
      .on("postgres_changes", { event: "*", schema: "public", table: "lances", filter: `jogo_id=eq.${jogoId}` }, carregar)
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [jogoId]);

  if (naoAchou) {
    return (
      <PwaLayout>
        <p className="p-8 text-center text-sm text-cinza">Jogo não encontrado.</p>
      </PwaLayout>
    );
  }
  if (!jogo) {
    return (
      <PwaLayout>
        <p className="p-8 text-center text-sm text-cinza">Carregando...</p>
      </PwaLayout>
    );
  }

  const aoVivo = jogo.status === "em_andamento";
  const comPlacar = jogo.status !== "agendado";
  const lancesDe = (equipeId: string | null) => lances.filter((l) => l.equipe_id === equipeId);
  const statusTexto =
    jogo.status === "em_andamento"
      ? "AO VIVO"
      : jogo.status === "encerrado"
        ? "Encerrado"
        : jogo.status === "wo"
          ? "W.O."
          : jogo.data_hora
            ? new Date(jogo.data_hora).toLocaleString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Data a definir";

  return (
    <PwaLayout>
      <div className="px-5 pt-6 space-y-5">
        <header className="flex items-center justify-between">
          <Link
            to="/jogos"
            aria-label="Voltar"
            className="w-10 h-10 rounded-full bg-cartao border border-borda flex items-center justify-center"
          >
            <IconeVoltar tamanho={18} />
          </Link>
          <span className="text-sm font-semibold">{jogo.fase ?? "Partida"}</span>
          <span className="w-10" />
        </header>

        <section className={`rounded-3xl p-6 ${aoVivo ? "bg-destaque text-preto" : "bg-cartao border border-borda"}`}>
          <div className={`text-center text-xs font-bold mb-4 ${aoVivo ? "" : "text-cinza"}`}>
            {aoVivo ? "● AO VIVO" : statusTexto}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <Time nome={jogo.equipe_a?.nome} url={jogo.equipe_a?.logo_url} vencedor={!!jogo.vencedor_id && jogo.vencedor_id === jogo.equipe_a_id} />
            <div className="text-center">
              <div className="text-4xl font-extrabold tabular-nums">
                {comPlacar ? `${jogo.placar_a ?? 0} - ${jogo.placar_b ?? 0}` : "×"}
              </div>
              {jogo.penaltis_a != null && jogo.penaltis_b != null && (
                <div className={`text-xs mt-1 ${aoVivo ? "" : "text-cinza"}`}>
                  Pênaltis {jogo.penaltis_a} - {jogo.penaltis_b}
                </div>
              )}
            </div>
            <Time nome={jogo.equipe_b?.nome} url={jogo.equipe_b?.logo_url} vencedor={!!jogo.vencedor_id && jogo.vencedor_id === jogo.equipe_b_id} />
          </div>
          {(jogo.local || (comPlacar && jogo.data_hora)) && (
            <div className={`mt-4 text-center text-xs ${aoVivo ? "opacity-70" : "text-cinza"}`}>
              {[jogo.local, comPlacar && jogo.data_hora ? new Date(jogo.data_hora).toLocaleDateString("pt-BR") : null]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
        </section>

        {lances.length > 0 && (
          <section className="rounded-3xl bg-cartao border border-borda p-5">
            <h2 className="text-sm font-semibold mb-4">Lances da partida</h2>
            <div className="grid grid-cols-2 gap-4">
              {[jogo.equipe_a_id, jogo.equipe_b_id].map((id, lado) => (
                <ul key={lado} className={`space-y-2 ${lado === 1 ? "text-right" : ""}`}>
                  {lancesDe(id).length === 0 && <li className="text-xs text-cinza">—</li>}
                  {lancesDe(id).map((l) => (
                    <li key={l.id} className={`flex items-center gap-2 text-sm ${lado === 1 ? "flex-row-reverse" : ""}`}>
                      <span title={ROTULO[l.tipo]}>{ICONE[l.tipo]}</span>
                      <span className="min-w-0 truncate">
                        {l.jogador_nome || ROTULO[l.tipo]}
                        {l.quantidade > 1 && <span className="text-cinza"> ×{l.quantidade}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </section>
        )}

        {!comPlacar && (
          <p className="rounded-2xl bg-cartao border border-borda p-4 text-sm text-cinza text-center">
            O placar e os lances aparecem aqui assim que o jogo começar.
          </p>
        )}
      </div>
    </PwaLayout>
  );
}

function Time({ nome, url, vencedor }: { nome?: string; url?: string | null; vencedor: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center min-w-0">
      <Escudo nome={nome} url={url} tamanho={56} />
      <span className={`text-sm leading-tight ${vencedor ? "font-extrabold" : "font-semibold"}`}>{nome ?? "A definir"}</span>
    </div>
  );
}
