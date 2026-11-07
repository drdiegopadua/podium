import { useEffect, useState } from "react";
import type { Jogo } from "@arena/shared";
import { supabase } from "./supabaseClient";

export interface JogoComEquipes extends Jogo {
  equipe_a: { nome: string; logo_url?: string | null } | null;
  equipe_b: { nome: string; logo_url?: string | null } | null;
}

/** Jogos do torneio com nomes das equipes, atualizados em tempo real. */
export function useJogos(eventoId: string | undefined) {
  const [jogos, setJogos] = useState<JogoComEquipes[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!eventoId) return;
    const carregar = () =>
      supabase
        .from("jogos")
        .select(
          "*, equipe_a:equipes!jogos_equipe_a_id_fkey(nome, logo_url), equipe_b:equipes!jogos_equipe_b_id_fkey(nome, logo_url)"
        )
        .eq("evento_id", eventoId)
        .order("data_hora", { ascending: true, nullsFirst: false })
        .then(({ data }) => {
          const lista = ((data as JogoComEquipes[]) ?? []).sort(
            (a, b) =>
              (a.data_hora ?? "9999").localeCompare(b.data_hora ?? "9999") ||
              (a.rodada ?? 0) - (b.rodada ?? 0) ||
              (a.ordem ?? 0) - (b.ordem ?? 0)
          );
          setJogos(lista);
          setCarregando(false);
        });

    carregar();
    const canal = supabase
      .channel(`jogos-${eventoId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "jogos", filter: `evento_id=eq.${eventoId}` }, () =>
        carregar()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [eventoId]);

  const aoVivo = jogos.filter((j) => j.status === "em_andamento");
  const proximos = jogos.filter((j) => j.status === "agendado");
  const encerrados = jogos.filter((j) => j.status === "encerrado" || j.status === "wo").reverse();

  return { jogos, aoVivo, proximos, encerrados, carregando };
}

export function dataHoraCurta(iso?: string | null) {
  if (!iso) return "A definir";
  return new Date(iso).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
