// Edge Function: convidar-membro
// Adiciona um usuario (por e-mail) a equipe de uma empresa. Se o e-mail ainda nao tem conta,
// envia convite do Supabase Auth. So dono/admin da empresa pode convidar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAPEIS = ["admin", "gestor", "arbitro"];

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { empresa_id, email, nome, papel, redirect_to } = await req.json();
  if (!empresa_id || !email || !PAPEIS.includes(papel)) {
    return resposta({ error: "Dados invalidos." }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Quem esta chamando?
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: chamador } = await admin.auth.getUser(token);
  if (!chamador.user) return resposta({ error: "Nao autenticado." }, 401);

  const { data: vinculo } = await admin
    .from("membros_empresa")
    .select("papel")
    .eq("empresa_id", empresa_id)
    .eq("perfil_id", chamador.user.id)
    .maybeSingle();
  if (!vinculo || !["dono", "admin"].includes(vinculo.papel)) {
    return resposta({ error: "Apenas o proprietario ou administradores podem convidar." }, 403);
  }

  const emailNormalizado = String(email).trim().toLowerCase();

  // Usuario ja existe?
  let usuarioId: string | null = null;
  for (let pagina = 1; pagina <= 20 && !usuarioId; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) return resposta({ error: error.message }, 400);
    usuarioId = data.users.find((u) => u.email?.toLowerCase() === emailNormalizado)?.id ?? null;
    if (data.users.length < 1000) break;
  }

  let convidado = false;
  if (!usuarioId) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(emailNormalizado, {
      data: { nome },
      redirectTo: redirect_to,
    });
    if (error) return resposta({ error: error.message }, 400);
    usuarioId = data.user.id;
    convidado = true;
  }

  await admin
    .from("perfis")
    .upsert(
      { id: usuarioId, nome: nome || emailNormalizado, tipo: papel === "arbitro" ? "arbitro" : "gestor_evento" },
      { onConflict: "id", ignoreDuplicates: true }
    );

  const { error: erroVinculo } = await admin
    .from("membros_empresa")
    .upsert({ empresa_id, perfil_id: usuarioId, papel }, { onConflict: "empresa_id,perfil_id" });
  if (erroVinculo) return resposta({ error: erroVinculo.message }, 400);

  return resposta({ ok: true, convidado });
});
