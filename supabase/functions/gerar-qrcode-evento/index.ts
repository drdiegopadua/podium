// Edge Function: gerar-qrcode-evento
// Gera codigo_evento unico, o link publico e retorna dados para renderizar o QR Code no client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const { evento_id } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const codigo = crypto.randomUUID().slice(0, 8).toUpperCase();
  const link = `https://app.padua.sports/e/${codigo}`;

  const { data, error } = await supabase
    .from("eventos")
    .update({ codigo_evento: codigo })
    .eq("id", evento_id)
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ evento: data, link, codigo }), {
    headers: { "Content-Type": "application/json" },
  });
});
