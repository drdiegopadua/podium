import { FormEvent, useCallback, useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { CampoImagem } from "../../components/CampoImagem";
import { useEventosDaEmpresa } from "../../components/SeletorEvento";
import { supabase } from "../../lib/supabaseClient";
import { enviarImagem } from "../../lib/upload";
import { useSessao } from "../../contexts/SessaoContext";

interface Patrocinador {
  id: string;
  evento_id: string | null;
  nome: string;
  logo_url: string | null;
  link: string | null;
  chamada: string | null;
  ordem: number;
  ativo: boolean;
}

const CHAMADAS = ["Patrocínio", "Oferecimento", "Apoio", "Parceiro oficial", "Realização"];

export function Patrocinadores() {
  const { empresaAtual } = useSessao();
  const { eventos } = useEventosDaEmpresa();
  const [lista, setLista] = useState<Patrocinador[]>([]);
  const [nome, setNome] = useState("");
  const [link, setLink] = useState("");
  const [chamada, setChamada] = useState("Patrocínio");
  const [escopo, setEscopo] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!empresaAtual) return;
    const { data } = await supabase
      .from("patrocinadores")
      .select("*")
      .eq("empresa_id", empresaAtual.id)
      .order("ordem")
      .order("criado_em");
    setLista((data as Patrocinador[]) ?? []);
  }, [empresaAtual]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!empresaAtual) return;
    setErro(null);
    if (!logo) return setErro("Envie o logo do patrocinador.");
    setSalvando(true);
    try {
      const logo_url = await enviarImagem(logo, `${empresaAtual.id}/patrocinadores`, 600);
      const linkLimpo = link.trim() ? (/^https?:\/\//.test(link.trim()) ? link.trim() : `https://${link.trim()}`) : null;
      const { error } = await supabase.from("patrocinadores").insert({
        empresa_id: empresaAtual.id,
        evento_id: escopo || null,
        nome: nome.trim(),
        logo_url,
        link: linkLimpo,
        chamada,
        ordem: lista.length,
      });
      if (error) throw error;
      setNome("");
      setLink("");
      setLogo(null);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function atualizar(p: Patrocinador, campos: Partial<Patrocinador>) {
    await supabase.from("patrocinadores").update(campos).eq("id", p.id);
    carregar();
  }

  async function mover(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= lista.length) return;
    await Promise.all([
      supabase.from("patrocinadores").update({ ordem: j }).eq("id", lista[i].id),
      supabase.from("patrocinadores").update({ ordem: i }).eq("id", lista[j].id),
    ]);
    carregar();
  }

  async function excluir(p: Patrocinador) {
    if (!confirm(`Remover o patrocinador "${p.nome}"?`)) return;
    await supabase.from("patrocinadores").delete().eq("id", p.id);
    carregar();
  }

  const nomeTorneio = (id: string | null) => (id ? eventos.find((e) => e.id === id)?.nome ?? "Torneio" : "Todos os torneios");

  return (
    <Layout>
      <PageHeader title="Patrocinadores" subtitle="Logos e links que aparecem no app dos torcedores" />
      <div className="grid lg:grid-cols-[420px_1fr] gap-6 items-start">
        <form onSubmit={adicionar} className="bg-cartao rounded-2xl border border-borda p-5 space-y-4">
          <h2 className="font-semibold">Novo patrocinador</h2>
          <CampoImagem arquivo={logo} onChange={setLogo} rotulo="Enviar logo" dica="PNG com fundo transparente fica melhor" />
          <label className="block">
            <span className="block text-sm text-white/80 mb-1">Nome</span>
            <input required value={nome} onChange={(e) => setNome(e.target.value)} className="input" />
          </label>
          <label className="block">
            <span className="block text-sm text-white/80 mb-1">Site ou Instagram (opcional)</span>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="instagram.com/marca" className="input" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm text-white/80 mb-1">Chamada</span>
              <select value={chamada} onChange={(e) => setChamada(e.target.value)} className="input">
                {CHAMADAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm text-white/80 mb-1">Aparece em</span>
              <select value={escopo} onChange={(e) => setEscopo(e.target.value)} className="input">
                <option value="">Todos os torneios</option>
                {eventos.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {erro && <p className="text-sm text-ps-vermelho">{erro}</p>}
          <button disabled={salvando} className="w-full rounded-full bg-destaque text-preto font-semibold py-2.5 text-sm disabled:opacity-50">
            {salvando ? "Salvando..." : "Adicionar patrocinador"}
          </button>
        </form>

        <div className="space-y-3">
          {lista.length === 0 && <p className="text-sm text-cinza">Nenhum patrocinador cadastrado.</p>}
          {lista.map((p, i) => (
            <div key={p.id} className={`bg-cartao rounded-2xl border border-borda p-4 flex items-center gap-4 ${p.ativo ? "" : "opacity-50"}`}>
              <div className="w-20 h-14 rounded-xl bg-white flex items-center justify-center shrink-0">
                {p.logo_url && <img src={p.logo_url} alt="" className="max-w-full max-h-full object-contain p-1.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-cinza">
                  {p.chamada} · {nomeTorneio(p.evento_id)}
                </div>
                <div className="font-bold truncate">{p.nome}</div>
                {p.link && (
                  <a href={p.link} target="_blank" rel="noreferrer" className="text-xs text-destaque underline truncate block">
                    {p.link}
                  </a>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 text-xs shrink-0">
                <div className="flex gap-2 text-cinza">
                  <button onClick={() => mover(i, -1)} aria-label="Subir">▲</button>
                  <button onClick={() => mover(i, 1)} aria-label="Descer">▼</button>
                </div>
                <button onClick={() => atualizar(p, { ativo: !p.ativo })} className="text-cinza underline">
                  {p.ativo ? "Ocultar" : "Mostrar"}
                </button>
                <button onClick={() => excluir(p)} className="text-ps-vermelho underline">
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
