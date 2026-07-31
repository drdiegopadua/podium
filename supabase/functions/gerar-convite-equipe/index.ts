// Edge Function: gerar-convite-equipe
// Gera um codigo_exclusivo unico para uma equipe (ex: AFC-VOLEI-EQP07) e retorna o link de convite.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const { equipe_id } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const codigo = `EQP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  const { data, error } = await supabase
    .from("equipes")
    .update({ codigo_exclusivo: codigo })
    .eq("id", equipe_id)
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(
    JSON.stringify({ equipe: data, link_convite: `https://podium-pwa.vercel.app/vincular/${codigo}` }),
    { headers: { "Content-Type": "application/json" } }
  );
});
