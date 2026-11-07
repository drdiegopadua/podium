import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { PLANOS, infoPlano, type Empresa, type PlanoEmpresa } from "@arena/shared";
import { Layout } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { supabase } from "../../lib/supabaseClient";
import { useSessao } from "../../contexts/SessaoContext";
import { URL_PWA } from "../../lib/config";

interface Uso {
  empresa_id: string;
  torneios_ativos: number;
  torneios_total: number;
  equipes: number;
  patrocinadores: number;
}
interface Pedido {
  id: string;
  empresa_id: string;
  plano: PlanoEmpresa;
  periodo: "mensal" | "anual";
  contato: string | null;
  mensagem: string | null;
  status: string;
  criado_em: string;
  empresa: { nome: string } | null;
}

const somarPeriodo = (periodo: "mensal" | "anual") => {
  const d = new Date();
  if (periodo === "anual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

/** Painel do dono da plataforma: empresas clientes, planos e pedidos de upgrade. */
export function Plataforma() {
  const { perfil, carregando: carregandoSessao } = useSessao();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [uso, setUso] = useState<Map<string, Uso>>(new Map());
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [edicao, setEdicao] = useState<Record<string, { plano: PlanoEmpresa; validade: string; ativo: boolean }>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    const [{ data: e }, { data: u }, { data: p }] = await Promise.all([
      supabase.from("empresas").select("*").order("criado_em", { ascending: false }),
      supabase.rpc("uso_empresas"),
      supabase
        .from("solicitacoes_plano")
        .select("*, empresa:empresas(nome)")
        .order("criado_em", { ascending: false })
        .limit(100),
    ]);
    const lista = (e as Empresa[]) ?? [];
    setEmpresas(lista);
    setUso(new Map(((u as Uso[]) ?? []).map((x) => [x.empresa_id, x])));
    setPedidos((p as Pedido[]) ?? []);
    setEdicao(
      Object.fromEntries(lista.map((x) => [x.id, { plano: x.plano, validade: x.plano_valido_ate ?? "", ativo: x.ativo }]))
    );
  }, []);

  useEffect(() => {
    if (perfil?.tipo === "super_admin") carregar();
  }, [perfil, carregar]);

  if (!carregandoSessao && perfil?.tipo !== "super_admin") return <Navigate to="/" replace />;

  async function salvarEmpresa(id: string) {
    const e = edicao[id];
    const { error } = await supabase
      .from("empresas")
      .update({ plano: e.plano, plano_valido_ate: e.validade || null, ativo: e.ativo })
      .eq("id", id);
    setMsg(error ? error.message : "Empresa atualizada.");
    carregar();
  }

  async function responder(p: Pedido, aprovar: boolean) {
    if (aprovar) {
      const { error } = await supabase
        .from("empresas")
        .update({ plano: p.plano, plano_valido_ate: somarPeriodo(p.periodo) })
        .eq("id", p.empresa_id);
      if (error) return setMsg(error.message);
    }
    await supabase
      .from("solicitacoes_plano")
      .update({ status: aprovar ? "aprovada" : "recusada", respondido_em: new Date().toISOString() })
      .eq("id", p.id);
    setMsg(aprovar ? `Plano ${infoPlano(p.plano).nome} ativado para ${p.empresa?.nome}.` : "Pedido recusado.");
    carregar();
  }

  const pendentes = pedidos.filter((p) => p.status === "pendente");
  const filtradas = empresas.filter((e) => e.nome.toLowerCase().includes(busca.toLowerCase()));
  const pagantes = empresas.filter((e) => e.plano !== "teste").length;
  const receita = empresas.reduce((s, e) => s + (infoPlano(e.plano).precoMensal ?? 0), 0);

  return (
    <Layout>
      <PageHeader title="Plataforma" subtitle="Área do dono do Arena Sports: clientes, planos e pedidos" />

      <div className="grid sm:grid-cols-4 gap-4 mb-8 max-w-5xl">
        <Cartao rotulo="Empresas" valor={empresas.length} />
        <Cartao rotulo="Em planos pagos" valor={pagantes} />
        <Cartao rotulo="Pedidos pendentes" valor={pendentes.length} destaque={pendentes.length > 0} />
        <Cartao
          rotulo="Receita mensal estimada"
          valor={receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        />
      </div>

      {msg && <p className="text-sm text-destaque mb-4">{msg}</p>}

      <section className="mb-10 max-w-5xl">
        <h2 className="font-bold mb-3">Pedidos de upgrade</h2>
        {pendentes.length === 0 && <p className="text-sm text-cinza">Nenhum pedido pendente.</p>}
        <div className="space-y-2">
          {pendentes.map((p) => (
            <div key={p.id} className="bg-cartao rounded-2xl border border-destaque/40 p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[220px]">
                <div className="font-semibold">{p.empresa?.nome}</div>
                <div className="text-sm text-cinza">
                  Quer o plano <b className="text-white">{infoPlano(p.plano).nome}</b> ({p.periodo}) ·{" "}
                  {new Date(p.criado_em).toLocaleString("pt-BR")}
                </div>
                {p.contato && (
                  <a
                    href={`https://wa.me/55${p.contato.replace(/\D/g, "").replace(/^55/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-destaque underline"
                  >
                    WhatsApp: {p.contato}
                  </a>
                )}
                {p.mensagem && <p className="text-sm text-white/80 mt-1">“{p.mensagem}”</p>}
              </div>
              <button onClick={() => responder(p, true)} className="rounded-full bg-destaque text-preto font-semibold px-4 py-2 text-sm">
                Aprovar (pago)
              </button>
              <button onClick={() => responder(p, false)} className="rounded-full border border-borda px-4 py-2 text-sm">
                Recusar
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3 max-w-6xl">
          <h2 className="font-bold">Empresas clientes</h2>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar empresa" className="input max-w-xs" />
        </div>
        <div className="bg-cartao rounded-2xl border border-borda overflow-x-auto max-w-6xl">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="text-xs text-cinza text-left">
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-2 font-medium">Uso</th>
                <th className="px-2 font-medium">Plano</th>
                <th className="px-2 font-medium">Válido até</th>
                <th className="px-2 font-medium">Ativa</th>
                <th className="px-4" />
              </tr>
            </thead>
            <tbody>
              {filtradas.map((e) => {
                const u = uso.get(e.id);
                const ed = edicao[e.id];
                if (!ed) return null;
                const mudou = ed.plano !== e.plano || ed.validade !== (e.plano_valido_ate ?? "") || ed.ativo !== e.ativo;
                return (
                  <tr key={e.id} className="border-t border-borda">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{e.nome}</div>
                      <a href={`${URL_PWA}/o/${e.slug}`} target="_blank" rel="noreferrer" className="text-xs text-cinza underline">
                        /o/{e.slug}
                      </a>
                      <div className="text-[11px] text-cinza">desde {new Date(e.criado_em).toLocaleDateString("pt-BR")}</div>
                    </td>
                    <td className="px-2 text-xs text-cinza">
                      {u?.torneios_ativos ?? 0} ativos / {u?.torneios_total ?? 0} torneios
                      <br />
                      {u?.equipes ?? 0} equipes · {u?.patrocinadores ?? 0} patroc.
                    </td>
                    <td className="px-2">
                      <select
                        value={ed.plano}
                        onChange={(ev) => setEdicao((x) => ({ ...x, [e.id]: { ...ed, plano: ev.target.value as PlanoEmpresa } }))}
                        className="input py-1.5"
                      >
                        {PLANOS.map((p) => (
                          <option key={p.codigo} value={p.codigo}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2">
                      <input
                        type="date"
                        value={ed.validade}
                        onChange={(ev) => setEdicao((x) => ({ ...x, [e.id]: { ...ed, validade: ev.target.value } }))}
                        className="input py-1.5"
                      />
                    </td>
                    <td className="px-2">
                      <input
                        type="checkbox"
                        checked={ed.ativo}
                        onChange={(ev) => setEdicao((x) => ({ ...x, [e.id]: { ...ed, ativo: ev.target.checked } }))}
                      />
                    </td>
                    <td className="px-4 text-right">
                      <button
                        disabled={!mudou}
                        onClick={() => salvarEmpresa(e.id)}
                        className="rounded-full bg-destaque text-preto font-semibold px-4 py-1.5 text-xs disabled:opacity-30"
                      >
                        Salvar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-cinza mt-2">
          Validade em branco = sem vencimento. Quando vence, a empresa volta automaticamente aos limites do plano Grátis.
        </p>
      </section>
    </Layout>
  );
}

function Cartao({ rotulo, valor, destaque = false }: { rotulo: string; valor: number | string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${destaque ? "border-destaque bg-destaque/10" : "border-borda bg-cartao"}`}>
      <div className="text-sm text-cinza">{rotulo}</div>
      <div className="text-2xl font-bold mt-1">{valor}</div>
    </div>
  );
}
