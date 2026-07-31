// Edge Function: calcular-classificacao
// Recalcula pontos/vitorias/derrotas/saldo de todas as equipes de um evento
// a partir dos jogos encerrados, e grava (upsert) na tabela classificacao.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { evento_id } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: jogos, error: erroJogos } = await supabase
    .from("jogos")
    .select("equipe_a_id, equipe_b_id, placar_a, placar_b, fase")
    .eq("evento_id", evento_id)
    .eq("status", "encerrado");

  if (erroJogos) {
    return new Response(JSON.stringify({ error: erroJogos.message }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const tabela = new Map<
    string,
    { pontos: number; vitorias: number; derrotas: number; saldo: number; grupo: string | null }
  >();

  const garantirEquipe = (id: string, grupo: string | null) => {
    if (!tabela.has(id)) {
      tabela.set(id, { pontos: 0, vitorias: 0, derrotas: 0, saldo: 0, grupo });
    }
    return tabela.get(id)!;
  };

  for (const jogo of jogos ?? []) {
    if (jogo.placar_a == null || jogo.placar_b == null) continue;
    const grupo = jogo.fase?.startsWith("grupo_") ? jogo.fase.replace("grupo_", "") : null;
    const a = garantirEquipe(jogo.equipe_a_id, grupo);
    const b = garantirEquipe(jogo.equipe_b_id, grupo);

    a.saldo += jogo.placar_a - jogo.placar_b;
    b.saldo += jogo.placar_b - jogo.placar_a;

    if (jogo.placar_a > jogo.placar_b) {
      a.vitorias += 1;
      a.pontos += 3;
      b.derrotas += 1;
    } else if (jogo.placar_b > jogo.placar_a) {
      b.vitorias += 1;
      b.pontos += 3;
      a.derrotas += 1;
    } else {
      a.pontos += 1;
      b.pontos += 1;
    }
  }

  const linhas = Array.from(tabela.entries()).map(([equipe_id, stats]) => ({
    evento_id,
    equipe_id,
    grupo: stats.grupo,
    pontos: stats.pontos,
    vitorias: stats.vitorias,
    derrotas: stats.derrotas,
    saldo: stats.saldo,
    atualizado_em: new Date().toISOString(),
  }));

  const { error: erroUpsert } = await supabase
    .from("classificacao")
    .upsert(linhas, { onConflict: "evento_id,equipe_id" });

  if (erroUpsert) {
    return new Response(JSON.stringify({ error: erroUpsert.message }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify({ equipes_atualizadas: linhas.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
