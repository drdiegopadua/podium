import { FormEvent, useEffect, useState } from "react";
import type { PapelEmpresa } from "@arena/shared";
import { Layout } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { supabase } from "../../lib/supabaseClient";
import { useSessao } from "../../contexts/SessaoContext";

interface Membro {
  perfil_id: string;
  papel: PapelEmpresa;
  perfil: { nome: string } | null;
}

const PAPEIS: Record<PapelEmpresa, string> = {
  dono: "Proprietário",
  admin: "Administrador",
  gestor: "Gestor de torneios",
  arbitro: "Árbitro / mesário",
};

const PLANOS: Record<string, string> = {
  teste: "Teste grátis",
  basico: "Básico",
  pro: "Pro",
  enterprise: "Enterprise",
};

export function MinhaEmpresa() {
  const { empresaAtual, papelAtual, sessao, recarregar } = useSessao();
  const podeEditar = papelAtual === "dono" || papelAtual === "admin";

  const [dados, setDados] = useState({ nome: "", cor_primaria: "#0A2342", cor_secundaria: "#D4AF37" });
  const [logo, setLogo] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [membros, setMembros] = useState<Membro[]>([]);
  const [convite, setConvite] = useState({ email: "", nome: "", papel: "gestor" as PapelEmpresa });
  const [msgConvite, setMsgConvite] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaAtual) return;
    setDados({
      nome: empresaAtual.nome,
      cor_primaria: empresaAtual.cor_primaria,
      cor_secundaria: empresaAtual.cor_secundaria,
    });
    carregarMembros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaAtual]);

  async function carregarMembros() {
    if (!empresaAtual) return;
    const { data } = await supabase
      .from("membros_empresa")
      .select("perfil_id, papel, perfil:perfis(nome)")
      .eq("empresa_id", empresaAtual.id);
    setMembros((data as unknown as Membro[]) ?? []);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!empresaAtual) return;
    setSalvando(true);
    setMsg(null);
    try {
      let logo_url = empresaAtual.logo_url ?? null;
      if (logo) {
        const caminho = `${empresaAtual.id}/logo-${Date.now()}-${logo.name}`;
        const { error } = await supabase.storage.from("logos-eventos").upload(caminho, logo);
        if (error) throw error;
        logo_url = supabase.storage.from("logos-eventos").getPublicUrl(caminho).data.publicUrl;
      }
      const { error } = await supabase
        .from("empresas")
        .update({ ...dados, logo_url })
        .eq("id", empresaAtual.id);
      if (error) throw error;
      await recarregar();
      setMsg("Dados salvos.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function convidar(e: FormEvent) {
    e.preventDefault();
    if (!empresaAtual) return;
    setMsgConvite(null);
    const { data, error } = await supabase.functions.invoke("convidar-membro", {
      body: { empresa_id: empresaAtual.id, ...convite, redirect_to: window.location.origin },
    });
    if (error || data?.error) {
      setMsgConvite(data?.error ?? error?.message ?? "Erro ao convidar.");
      return;
    }
    setMsgConvite(data.convidado ? "Convite enviado por e-mail." : "Usuário adicionado à equipe.");
    setConvite({ email: "", nome: "", papel: "gestor" });
    carregarMembros();
  }

  async function remover(perfilId: string) {
    if (!empresaAtual || !confirm("Remover este membro da empresa?")) return;
    await supabase.from("membros_empresa").delete().eq("empresa_id", empresaAtual.id).eq("perfil_id", perfilId);
    carregarMembros();
  }

  if (!empresaAtual) return null;

  return (
    <Layout>
      <PageHeader title="Minha empresa" subtitle={`Plano: ${PLANOS[empresaAtual.plano] ?? empresaAtual.plano}`} />

      <div className="grid lg:grid-cols-2 gap-6 max-w-5xl">
        <form onSubmit={salvar} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-bold text-ps-azul-escuro">Identidade</h2>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Nome</span>
            <input
              disabled={!podeEditar}
              required
              value={dados.nome}
              onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))}
              className="input"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Cor principal</span>
              <input
                type="color"
                disabled={!podeEditar}
                value={dados.cor_primaria}
                onChange={(e) => setDados((d) => ({ ...d, cor_primaria: e.target.value }))}
                className="h-10 w-full rounded"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1">Cor de destaque</span>
              <input
                type="color"
                disabled={!podeEditar}
                value={dados.cor_secundaria}
                onChange={(e) => setDados((d) => ({ ...d, cor_secundaria: e.target.value }))}
                className="h-10 w-full rounded"
              />
            </label>
          </div>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Logo</span>
            {empresaAtual.logo_url && (
              <img src={empresaAtual.logo_url} alt="" className="h-12 mb-2 object-contain" />
            )}
            <input
              type="file"
              accept="image/*"
              disabled={!podeEditar}
              onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </label>
          <p className="text-xs text-slate-500">
            As cores e o logo aparecem no app dos torcedores nos torneios da sua empresa.
          </p>
          {msg && <p className="text-sm text-slate-600">{msg}</p>}
          {podeEditar && (
            <button
              disabled={salvando}
              className="rounded-lg bg-ps-dourado text-ps-azul-escuro font-semibold px-5 py-2 text-sm disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          )}
        </form>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-bold text-ps-azul-escuro">Equipe</h2>
          <ul className="divide-y divide-slate-100">
            {membros.map((m) => (
              <li key={m.perfil_id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">
                    {m.perfil?.nome ?? "—"}
                    {m.perfil_id === sessao?.user.id && " (você)"}
                  </div>
                  <div className="text-xs text-slate-500">{PAPEIS[m.papel]}</div>
                </div>
                {podeEditar && m.papel !== "dono" && m.perfil_id !== sessao?.user.id && (
                  <button onClick={() => remover(m.perfil_id)} className="text-xs text-ps-vermelho underline">
                    Remover
                  </button>
                )}
              </li>
            ))}
          </ul>

          {podeEditar && (
            <form onSubmit={convidar} className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-700">Adicionar pessoa</h3>
              <input
                required
                type="email"
                placeholder="E-mail"
                value={convite.email}
                onChange={(e) => setConvite((c) => ({ ...c, email: e.target.value }))}
                className="input"
              />
              <input
                placeholder="Nome"
                value={convite.nome}
                onChange={(e) => setConvite((c) => ({ ...c, nome: e.target.value }))}
                className="input"
              />
              <select
                value={convite.papel}
                onChange={(e) => setConvite((c) => ({ ...c, papel: e.target.value as PapelEmpresa }))}
                className="input"
              >
                <option value="admin">{PAPEIS.admin}</option>
                <option value="gestor">{PAPEIS.gestor}</option>
                <option value="arbitro">{PAPEIS.arbitro}</option>
              </select>
              {msgConvite && <p className="text-sm text-slate-600">{msgConvite}</p>}
              <button className="rounded-lg bg-ps-azul-escuro text-white font-semibold px-4 py-2 text-sm">
                Convidar
              </button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
