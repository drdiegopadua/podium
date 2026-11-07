import { FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { CampoImagem } from "../../components/CampoImagem";
import { SeletorEvento, useEventoSelecionado } from "../../components/SeletorEvento";
import { supabase } from "../../lib/supabaseClient";
import { enviarImagem, validarImagem } from "../../lib/upload";
import { useSessao } from "../../contexts/SessaoContext";
import type { Equipe } from "@arena/shared";

function gerarCodigoExclusivo(): string {
  return `EQP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export function Equipes() {
  const { empresaAtual } = useSessao();
  const { eventos, eventoId, setEventoId } = useEventoSelecionado();
  const [params] = useSearchParams();
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nomeNovaEquipe, setNomeNovaEquipe] = useState("");
  const [escudoNovo, setEscudoNovo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [codigoCopiado, setCodigoCopiado] = useState<string | null>(null);

  const pastaEscudos = `${empresaAtual?.id ?? "sem-empresa"}/escudos`;
  const eventoAtual = eventos.find((e) => e.id === eventoId);

  // /equipes?evento=ID abre ja no torneio certo
  useEffect(() => {
    const pedido = params.get("evento");
    if (pedido && eventos.some((e) => e.id === pedido)) setEventoId(pedido);
  }, [params, eventos, setEventoId]);

  useEffect(() => {
    if (!eventoId) {
      setEquipes([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    supabase
      .from("equipes")
      .select("*")
      .eq("evento_id", eventoId)
      .order("nome")
      .then(({ data }) => {
        setEquipes((data as Equipe[]) ?? []);
        setCarregando(false);
      });
  }, [eventoId]);

  async function criarEquipe(evento: FormEvent) {
    evento.preventDefault();
    if (!eventoId || !nomeNovaEquipe.trim()) return;
    setErro(null);
    setSalvando(true);

    try {
      const logo_url = escudoNovo ? await enviarImagem(escudoNovo, pastaEscudos) : null;
      const { data, error } = await supabase
        .from("equipes")
        .insert({
          evento_id: eventoId,
          nome: nomeNovaEquipe.trim(),
          codigo_exclusivo: gerarCodigoExclusivo(),
          logo_url,
        })
        .select()
        .single();
      if (error) throw error;
      setEquipes((atual) => [...atual, data as Equipe].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNomeNovaEquipe("");
      setEscudoNovo(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao cadastrar equipe.");
    } finally {
      setSalvando(false);
    }
  }

  async function trocarEscudo(equipe: Equipe, arquivo: File | null) {
    setErro(null);
    try {
      const logo_url = arquivo ? await enviarImagem(arquivo, pastaEscudos) : null;
      const { error } = await supabase.from("equipes").update({ logo_url }).eq("id", equipe.id);
      if (error) throw error;
      setEquipes((atual) => atual.map((e) => (e.id === equipe.id ? { ...e, logo_url } : e)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar o escudo.");
    }
  }

  async function copiarCodigo(codigo: string) {
    await navigator.clipboard.writeText(codigo);
    setCodigoCopiado(codigo);
    setTimeout(() => setCodigoCopiado(null), 1500);
  }

  return (
    <Layout>
      <PageHeader title="Equipes" subtitle="Cadastre as equipes, os escudos e os códigos de convite" />

      <div className="mb-6">
        <label className="block text-sm font-medium text-white/80 mb-1">Torneio</label>
        <SeletorEvento eventos={eventos} eventoId={eventoId} onChange={setEventoId} />
        {eventoAtual && (
          <p className="text-xs text-cinza mt-2">
            {equipes.length} de {eventoAtual.qtd_equipes} equipes cadastradas
          </p>
        )}
      </div>

      {eventoId && (
        <form
          onSubmit={criarEquipe}
          className="bg-cartao rounded-2xl border border-borda p-5 mb-6 max-w-2xl space-y-4"
        >
          <h2 className="font-semibold">Nova equipe</h2>
          <CampoImagem
            arquivo={escudoNovo}
            onChange={setEscudoNovo}
            rotulo="Enviar escudo"
            dica="Opcional · PNG com fundo transparente fica melhor"
            redondo
            tamanho="md"
          />
          <div className="flex items-end gap-3">
            <label className="block flex-1">
              <span className="block text-sm font-medium text-white/80 mb-1">Nome da equipe</span>
              <input
                required
                value={nomeNovaEquipe}
                onChange={(e) => setNomeNovaEquipe(e.target.value)}
                className="input"
              />
            </label>
            <button
              type="submit"
              disabled={salvando}
              className="rounded-full bg-destaque text-preto font-semibold px-5 py-2.5 text-sm hover:brightness-95 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "+ Adicionar"}
            </button>
          </div>
        </form>
      )}

      {erro && <p className="text-sm text-ps-vermelho mb-4">{erro}</p>}

      {carregando && <p className="text-sm text-cinza">Carregando...</p>}

      {!carregando && eventoId && equipes.length === 0 && (
        <p className="text-sm text-cinza">Nenhuma equipe cadastrada neste torneio ainda.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipes.map((equipe) => (
          <div key={equipe.id} className="bg-cartao rounded-2xl border border-borda p-5">
            <div className="flex items-center gap-4">
              <EscudoEditavel equipe={equipe} onTrocar={(f) => trocarEscudo(equipe, f)} />
              <div className="min-w-0">
                <div className="text-lg font-bold text-white truncate">{equipe.nome}</div>
                {equipe.posicao_grupo && (
                  <div className="text-xs text-destaque font-semibold mt-0.5">Grupo {equipe.posicao_grupo}</div>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <code className="text-xs bg-fundo rounded px-2 py-1 text-white">{equipe.codigo_exclusivo}</code>
              <button onClick={() => copiarCodigo(equipe.codigo_exclusivo)} className="text-xs text-destaque underline">
                {codigoCopiado === equipe.codigo_exclusivo ? "Copiado!" : "Copiar"}
              </button>
            </div>
            <p className="text-xs text-cinza mt-2">Envie esse código ao capitão para vincular atletas pelo app.</p>
          </div>
        ))}
      </div>
    </Layout>
  );
}

/** Escudo clicavel: abre o seletor de arquivo e salva na hora. */
function EscudoEditavel({ equipe, onTrocar }: { equipe: Equipe; onTrocar: (f: File | null) => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function escolher(f: File | undefined) {
    if (!f) return;
    const problema = validarImagem(f);
    if (problema) {
      alert(problema);
      return;
    }
    setEnviando(true);
    await onTrocar(f);
    setEnviando(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="shrink-0 text-center">
      <button
        type="button"
        onClick={() => input.current?.click()}
        title={equipe.logo_url ? "Trocar escudo" : "Enviar escudo"}
        className="group relative w-16 h-16 rounded-full overflow-hidden bg-cartao-2 border border-borda hover:border-destaque flex items-center justify-center"
      >
        {equipe.logo_url ? (
          <img src={equipe.logo_url} alt="" className="w-full h-full object-contain p-1.5" />
        ) : (
          <span className="text-lg font-bold text-cinza">{iniciais(equipe.nome)}</span>
        )}
        <span className="absolute inset-0 bg-black/60 text-[10px] font-semibold text-destaque flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {enviando ? "Enviando..." : equipe.logo_url ? "Trocar" : "Escudo"}
        </span>
      </button>
      {equipe.logo_url && (
        <button
          type="button"
          onClick={() => confirm("Remover o escudo desta equipe?") && onTrocar(null)}
          className="mt-1 text-[10px] text-cinza underline"
        >
          remover
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        className="hidden"
        onChange={(e) => escolher(e.target.files?.[0])}
      />
    </div>
  );
}

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
