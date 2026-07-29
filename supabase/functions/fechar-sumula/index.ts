// Edge Function: fechar-sumula
// Valida e trava a sumula (status = 'fechada'), depois dispara o recalculo de classificacao.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const { sumula_id, arbitro_id } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: sumula, error: erroSumula } = await supabase
    .from("sumulas")
    .select("*, jogos(evento_id, equipe_a_id, equipe_b_id)")
    .eq("id", sumula_id)
    .single();

  if (erroSumula || !sumula) {
    return new Response(JSON.stringify({ error: erroSumula?.message ?? "sumula nao encontrada" }), {
      status: 404,
    });
  }

  if (sumula.status === "fechada") {
    return new Response(JSON.stringify({ error: "sumula ja esta fechada" }), { status: 409 });
  }

  const { error: erroUpdate } = await supabase
    .from("sumulas")
    .update({ status: "fechada", fechada_por: arbitro_id, fechada_em: new Date().toISOString() })
    .eq("id", sumula_id);

  if (erroUpdate) {
    return new Response(JSON.stringify({ error: erroUpdate.message }), { status: 400 });
  }

  const evento_id = (sumula as { jogos: { evento_id: string } }).jogos.evento_id;

  await supabase.functions.invoke("calcular-classificacao", {
    body: { evento_id },
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
