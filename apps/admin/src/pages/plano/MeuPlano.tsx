import { FormEvent, useCallback, useEffect, useState } from "react";
import { PLANOS, formatarPreco, infoPlano, type InfoPlano } from "@arena/shared";
import { Layout } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { supabase } from "../../lib/supabaseClient";
import { useSessao } from "../../contexts/SessaoContext";

interface Uso {
  torneios_ativos: number;
  torneios_total: number;
  equipes: number;
  patrocinadores: number;
}
interface Pedido {
  id: string;
  plano: string;
  periodo: string;
  status: string;
  criado_em: string;
}

export function MeuPlano() {
  const { empresaAtual, papelAtual, perfil } = useSessao();
  const [uso, setUso] = useState<Uso | null>(null);
  const [maiorTorneio, setMaiorTorneio] = useState(0);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [anual, setAnual] = useState(false);
  const [escolhido, setEscolhido] = useState<InfoPlano | null>(null);
  const [contato, setContato] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const podePedir = papelAtual === "dono" || papelAtual === "admin";
  const vencido = !!empresaAtual?.plano_valido_ate && new Date(empresaAtual.plano_valido_ate + "T23:59") < new Date();
  const atual = infoPlano(vencido ? "teste" : empresaAtual?.plano);

  const carregar = useCallback(async () => {
    if (!empresaAtual) return;
    const [{ data: u }, { data: p }, { data: ev }] = await Promise.all([
      supabase.rpc("uso_empresas"),
      supabase.from("solicitacoes_plano").select("*").eq("empresa_id", empresaAtual.id).order("criado_em", { ascending: false }),
      supabase.from("eventos").select("id, equipes(count)").eq("empresa_id", empresaAtual.id),
    ]);
    const linha = ((u as (Uso & { empresa_id: string })[]) ?? []).find((x) => x.empresa_id === empresaAtual.id);
    setUso(linha ?? null);
    setPedidos((p as Pedido[]) ?? []);
    const contagens = ((ev as { equipes: { count: number }[] }[]) ?? []).map((e) => e.equipes?.[0]?.count ?? 0);
    setMaiorTorneio(Math.max(0, ...contagens));
  }, [empresaAtual]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function pedir(e: FormEvent) {
    e.preventDefault();
    if (!empresaAtual || !escolhido) return;
    setEnviando(true);
    setMsg(null);
    const { error } = await supabase.from("solicitacoes_plano").insert({
      empresa_id: empresaAtual.id,
      plano: escolhido.codigo,
      periodo: anual ? "anual" : "mensal",
      contato: contato.trim() || null,
      mensagem: mensagem.trim() || null,
      solicitado_por: perfil?.id ?? null,
    });
    setEnviando(false);
    if (error) return setMsg({ ok: false, texto: error.message });
    setMsg({ ok: true, texto: "Pedido enviado! Nossa equipe vai entrar em contato para concluir a assinatura." });
    setEscolhido(null);
    setMensagem("");
    carregar();
  }

  const pendente = pedidos.find((p) => p.status === "pendente");

  return (
    <Layout>
      <PageHeader title="Meu plano" subtitle="Seu plano, o uso atual e as opções de upgrade" />

      <section className="bg-cartao rounded-2xl border border-borda p-6 max-w-5xl mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-cinza">Plano atual</div>
            <div className="text-2xl font-bold mt-1">{atual.nome}</div>
            {empresaAtual?.plano_valido_ate && (
              <div className={`text-sm mt-1 ${vencido ? "text-ps-vermelho" : "text-cinza"}`}>
                {vencido ? "Venceu em " : "Válido até "}
                {new Date(empresaAtual.plano_valido_ate + "T12:00").toLocaleDateString("pt-BR")}
                {vencido && " — voltou para o plano Grátis"}
              </div>
            )}
          </div>
          {pendente && (
            <div className="rounded-xl border border-destaque/40 bg-destaque/10 px-4 py-2 text-sm">
              Pedido de upgrade para <b>{infoPlano(pendente.plano).nome}</b> em análise
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          <Medidor rotulo="Campeonatos ativos" uso={uso?.torneios_ativos ?? 0} limite={atual.limites.torneios} />
          <Medidor rotulo="Equipes no maior campeonato" uso={maiorTorneio} limite={atual.limites.equipes} />
          <Medidor rotulo="Patrocinadores" uso={uso?.patrocinadores ?? 0} limite={atual.limites.patrocinadores} />
        </div>
      </section>

      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-bold text-lg">Planos</h2>
        <div className="flex rounded-full bg-cartao border border-borda p-1 text-xs font-semibold">
          <button onClick={() => setAnual(false)} className={`rounded-full px-3 py-1.5 ${!anual ? "bg-destaque text-preto" : "text-cinza"}`}>
            Mensal
          </button>
          <button onClick={() => setAnual(true)} className={`rounded-full px-3 py-1.5 ${anual ? "bg-destaque text-preto" : "text-cinza"}`}>
            Anual −20%
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 max-w-6xl">
        {PLANOS.map((p) => {
          const ehAtual = p.codigo === atual.codigo;
          const preco = anual ? p.precoAnualMes : p.precoMensal;
          return (
            <div
              key={p.codigo}
              className={`rounded-2xl border p-5 flex flex-col ${p.destaque ? "border-destaque bg-destaque/5" : "border-borda bg-cartao"}`}
            >
              {p.destaque && <div className="text-[10px] font-bold uppercase tracking-wide text-destaque mb-1">Mais escolhido</div>}
              <div className="font-bold text-lg">{p.nome}</div>
              <div className="text-xs text-cinza mt-1 min-h-[32px]">{p.descricao}</div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold">{formatarPreco(preco)}</span>
                {preco ? <span className="text-sm text-cinza">/mês</span> : null}
                {anual && preco ? <div className="text-[11px] text-cinza">cobrado anualmente</div> : null}
              </div>
              <ul className="mt-4 space-y-1.5 text-sm text-white/80 flex-1">
                {p.recursos.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span className="text-destaque">✓</span>
                    {r}
                  </li>
                ))}
              </ul>
              <button
                disabled={ehAtual || !podePedir || p.codigo === "teste" || !!pendente}
                onClick={() => {
                  setEscolhido(p);
                  setMsg(null);
                }}
                className={`mt-5 rounded-full py-2.5 text-sm font-semibold disabled:opacity-50 ${
                  p.destaque ? "bg-destaque text-preto" : "border border-borda"
                }`}
              >
                {ehAtual ? "Seu plano" : p.codigo === "teste" ? "Plano básico" : p.precoMensal == null ? "Falar com vendas" : "Quero este plano"}
              </button>
            </div>
          );
        })}
      </div>
      {!podePedir && <p className="text-xs text-cinza mt-3">Somente o proprietário ou administradores podem pedir upgrade.</p>}
      {msg && <p className={`text-sm mt-4 ${msg.ok ? "text-destaque" : "text-ps-vermelho"}`}>{msg.texto}</p>}

      {escolhido && (
        <form onSubmit={pedir} className="mt-6 max-w-xl bg-cartao rounded-2xl border border-borda p-5 space-y-3">
          <h3 className="font-semibold">
            Pedir plano {escolhido.nome} ({anual ? "anual" : "mensal"})
          </h3>
          <label className="block">
            <span className="block text-sm text-white/80 mb-1">WhatsApp para contato</span>
            <input required value={contato} onChange={(e) => setContato(e.target.value)} placeholder="(27) 99999-9999" className="input" />
          </label>
          <label className="block">
            <span className="block text-sm text-white/80 mb-1">Observações (opcional)</span>
            <textarea rows={3} value={mensagem} onChange={(e) => setMensagem(e.target.value)} className="input" />
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setEscolhido(null)} className="rounded-full border border-borda px-5 py-2 text-sm">
              Cancelar
            </button>
            <button disabled={enviando} className="rounded-full bg-destaque text-preto font-semibold px-5 py-2 text-sm disabled:opacity-60">
              {enviando ? "Enviando..." : "Enviar pedido"}
            </button>
          </div>
        </form>
      )}

      {pedidos.length > 0 && (
        <section className="mt-8 max-w-xl">
          <h3 className="text-sm font-semibold mb-2">Histórico de pedidos</h3>
          <ul className="space-y-1 text-sm">
            {pedidos.map((p) => (
              <li key={p.id} className="flex justify-between border-b border-borda py-1.5">
                <span>
                  {infoPlano(p.plano).nome} · {p.periodo}
                </span>
                <span className="text-cinza">
                  {p.status === "pendente" ? "Em análise" : p.status === "aprovada" ? "Aprovado" : "Recusado"} ·{" "}
                  {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Layout>
  );
}

function Medidor({ rotulo, uso, limite }: { rotulo: string; uso: number; limite: number | null }) {
  const pct = limite ? Math.min(100, (uso / limite) * 100) : 0;
  const cheio = limite != null && uso >= limite;
  return (
    <div className="rounded-xl bg-cartao-2 border border-borda p-4">
      <div className="text-xs text-cinza">{rotulo}</div>
      <div className="mt-1 text-xl font-bold">
        {uso}
        <span className="text-sm text-cinza font-normal"> / {limite ?? "ilimitado"}</span>
      </div>
      {limite != null && (
        <div className="mt-2 h-1.5 rounded-full bg-borda overflow-hidden">
          <div className={`h-full ${cheio ? "bg-ps-vermelho" : "bg-destaque"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
