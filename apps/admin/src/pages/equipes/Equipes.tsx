import { FormEvent, useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { SeletorEvento, useEventoSelecionado } from "../../components/SeletorEvento";
import { supabase } from "../../lib/supabaseClient";
import type { Equipe } from "@podium/shared";

function gerarCodigoExclusivo(): string {
  return `EQP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export function Equipes() {
  const { eventos, eventoId, setEventoId } = useEventoSelecionado();
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nomeNovaEquipe, setNomeNovaEquipe] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [codigoCopiado, setCodigoCopiado] = useState<string | null>(null);

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

    const { data, error } = await supabase
      .from("equipes")
      .insert({
        evento_id: eventoId,
        nome: nomeNovaEquipe.trim(),
        codigo_exclusivo: gerarCodigoExclusivo(),
      })
      .select()
      .single();

    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setEquipes((atual) => [...atual, data as Equipe].sort((a, b) => a.nome.localeCompare(b.nome)));
    setNomeNovaEquipe("");
  }

  async function copiarCodigo(codigo: string) {
    await navigator.clipboard.writeText(codigo);
    setCodigoCopiado(codigo);
    setTimeout(() => setCodigoCopiado(null), 1500);
  }

  return (
    <Layout>
      <PageHeader title="Equipes" subtitle="Gerenciar equipes e codigos de convite" />

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">Evento</label>
        <SeletorEvento eventos={eventos} eventoId={eventoId} onChange={setEventoId} />
      </div>

      {eventoId && (
        <form
          onSubmit={criarEquipe}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-6 flex items-end gap-3 max-w-lg"
        >
          <label className="block flex-1">
            <span className="block text-sm font-medium text-slate-700 mb-1">Nome da equipe</span>
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
            className="rounded-lg bg-ps-dourado text-ps-azul-escuro font-semibold px-4 py-2 text-sm hover:brightness-95 disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "+ Adicionar"}
          </button>
        </form>
      )}

      {erro && <p className="text-sm text-ps-vermelho mb-4">{erro}</p>}

      {carregando && <p className="text-sm text-slate-500">Carregando...</p>}

      {!carregando && eventoId && equipes.length === 0 && (
        <p className="text-sm text-slate-500">Nenhuma equipe cadastrada neste evento ainda.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipes.map((equipe) => (
          <div key={equipe.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div className="text-lg font-bold text-ps-azul-escuro">{equipe.nome}</div>
            {equipe.posicao_grupo && (
              <div className="text-xs text-ps-dourado font-semibold mt-1">Grupo {equipe.posicao_grupo}</div>
            )}
            <div className="mt-3 flex items-center gap-2">
              <code className="text-xs bg-ps-cinza-claro rounded px-2 py-1 text-ps-azul-escuro">
                {equipe.codigo_exclusivo}
              </code>
              <button
                onClick={() => copiarCodigo(equipe.codigo_exclusivo)}
                className="text-xs text-ps-azul-marinho underline"
              >
                {codigoCopiado === equipe.codigo_exclusivo ? "Copiado!" : "Copiar"}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Envie esse codigo ao capitao para vincular atletas pelo PWA.
            </p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
