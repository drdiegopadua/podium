// Edge Function: realizar-sorteio
// Embaralha as equipes de um evento (Fisher-Yates), grava posicao_grupo e gera os jogos iniciais.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fisherYates<T>(itens: T[]): T[] {
  const arr = [...itens];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { evento_id, qtd_grupos = 1 } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: equipes, error: erroEquipes } = await supabase
    .from("equipes")
    .select("id")
    .eq("evento_id", evento_id);

  if (erroEquipes || !equipes) {
    return new Response(JSON.stringify({ error: erroEquipes?.message }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const sorteadas = fisherYates(equipes);
  const grupos = "ABCDEFGH".slice(0, qtd_grupos).split("");

  const atualizacoes = sorteadas.map((equipe, indice) =>
    supabase
      .from("equipes")
      .update({ posicao_grupo: grupos[indice % grupos.length] })
      .eq("id", equipe.id)
  );
  await Promise.all(atualizacoes);

  const jogosPorGrupo: Record<string, string[]> = {};
  sorteadas.forEach((equipe, indice) => {
    const grupo = grupos[indice % grupos.length];
    jogosPorGrupo[grupo] = jogosPorGrupo[grupo] ?? [];
    jogosPorGrupo[grupo].push(equipe.id);
  });

  const novosJogos = [];
  for (const [fase, times] of Object.entries(jogosPorGrupo)) {
    for (let i = 0; i < times.length; i++) {
      for (let j = i + 1; j < times.length; j++) {
        novosJogos.push({
          evento_id,
          fase: `grupo_${fase}`,
          equipe_a_id: times[i],
          equipe_b_id: times[j],
          status: "agendado",
        });
      }
    }
  }

  const { error: erroJogos } = await supabase.from("jogos").insert(novosJogos);
  if (erroJogos) {
    return new Response(JSON.stringify({ error: erroJogos.message }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  await supabase.from("eventos").update({ status: "sorteio_realizado" }).eq("id", evento_id);

  return new Response(JSON.stringify({ equipes: sorteadas, jogos_gerados: novosJogos.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
