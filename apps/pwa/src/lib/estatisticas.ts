import { useEffect, useState } from "react";
import type { Lance } from "@arena/shared";
import { supabase } from "./supabaseClient";
import type { JogoComEquipes } from "./useJogos";

export interface LanceComEquipe extends Lance {
  equipe: { nome: string; logo_url?: string | null } | null;
}

/** Lances (gols/cartoes) do torneio, em tempo real. */
export function useLances(eventoId: string | undefined) {
  const [lances, setLances] = useState<LanceComEquipe[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!eventoId) return;
    const carregar = () =>
      supabase
        .from("lances")
        .select("*, equipe:equipes(nome, logo_url)")
        .eq("evento_id", eventoId)
        .then(({ data }) => {
          setLances((data as LanceComEquipe[]) ?? []);
          setCarregando(false);
        });
    carregar();
    const canal = supabase
      .channel(`lances-${eventoId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lances", filter: `evento_id=eq.${eventoId}` }, () =>
        carregar()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [eventoId]);

  return { lances, carregando };
}

export interface ItemRanking {
  chave: string;
  nome: string;
  equipe: string;
  logo?: string | null;
  total: number;
}

const chaveJogador = (l: Lance) => `${l.equipe_id}|${(l.jogador_nome ?? "").trim().toLowerCase()}`;

export function ranking(lances: LanceComEquipe[], tipo: Lance["tipo"]): ItemRanking[] {
  const mapa = new Map<string, ItemRanking>();
  for (const l of lances) {
    if (l.tipo !== tipo || !l.jogador_nome?.trim()) continue;
    const k = chaveJogador(l);
    const item = mapa.get(k) ?? {
      chave: k,
      nome: l.jogador_nome.trim(),
      equipe: l.equipe?.nome ?? "",
      logo: l.equipe?.logo_url,
      total: 0,
    };
    item.total += l.quantidade;
    mapa.set(k, item);
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));
}

export interface SituacaoDisciplinar extends ItemRanking {
  amarelos: number;
  vermelhos: number;
  motivo?: string;
}

/**
 * Suspensos: vermelho no ultimo jogo da equipe, ou completou N amarelos no ultimo jogo.
 * Pendurados: falta 1 amarelo para a suspensao.
 */
export function situacaoDisciplinar(lances: LanceComEquipe[], jogos: JogoComEquipes[], limiteAmarelos: number) {
  const encerrados = jogos
    .filter((j) => j.status === "encerrado" || j.status === "wo")
    .sort((a, b) => (a.data_hora ?? "").localeCompare(b.data_hora ?? "") || (a.ordem ?? 0) - (b.ordem ?? 0));
  const ultimoJogo = new Map<string, string>();
  for (const j of encerrados) {
    if (j.equipe_a_id) ultimoJogo.set(j.equipe_a_id, j.id);
    if (j.equipe_b_id) ultimoJogo.set(j.equipe_b_id, j.id);
  }

  const porJogador = new Map<string, SituacaoDisciplinar & { amarelosNoUltimo: number; vermelhoNoUltimo: boolean }>();
  for (const l of lances) {
    if ((l.tipo !== "amarelo" && l.tipo !== "vermelho") || !l.jogador_nome?.trim()) continue;
    const k = chaveJogador(l);
    const s = porJogador.get(k) ?? {
      chave: k,
      nome: l.jogador_nome.trim(),
      equipe: l.equipe?.nome ?? "",
      logo: l.equipe?.logo_url,
      total: 0,
      amarelos: 0,
      vermelhos: 0,
      amarelosNoUltimo: 0,
      vermelhoNoUltimo: false,
    };
    const noUltimo = l.equipe_id ? ultimoJogo.get(l.equipe_id) === l.jogo_id : false;
    if (l.tipo === "amarelo") {
      s.amarelos += l.quantidade;
      if (noUltimo) s.amarelosNoUltimo += l.quantidade;
    } else {
      s.vermelhos += l.quantidade;
      if (noUltimo) s.vermelhoNoUltimo = true;
    }
    s.total = s.amarelos + s.vermelhos * 3;
    porJogador.set(k, s);
  }

  const suspensos: SituacaoDisciplinar[] = [];
  const pendurados: SituacaoDisciplinar[] = [];
  for (const s of porJogador.values()) {
    const completouAmarelos =
      limiteAmarelos > 0 && s.amarelosNoUltimo > 0 && s.amarelos % limiteAmarelos === 0;
    if (s.vermelhoNoUltimo) suspensos.push({ ...s, motivo: "Cartão vermelho" });
    else if (completouAmarelos) suspensos.push({ ...s, motivo: `${limiteAmarelos} amarelos` });
    else if (limiteAmarelos > 1 && s.amarelos % limiteAmarelos === limiteAmarelos - 1)
      pendurados.push({ ...s, motivo: `${s.amarelos} amarelo${s.amarelos > 1 ? "s" : ""}` });
  }
  const cartoes = [...porJogador.values()].sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));
  return { suspensos, pendurados, cartoes };
}
