import { useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { SeletorEvento, useEventoSelecionado } from "../../components/SeletorEvento";
import { supabase } from "../../lib/supabaseClient";
import type { Atleta, Equipe } from "@podium/shared";

interface AtletaComEquipe extends Atleta {
  equipe_nome: string;
}

export function Atletas() {
  const { eventos, eventoId, setEventoId } = useEventoSelecionado();
  const [atletas, setAtletas] = useState<AtletaComEquipe[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!eventoId) {
      setAtletas([]);
      setCarregando(false);
      return;
    }
    carregarAtletas(eventoId);
  }, [eventoId]);

  async function carregarAtletas(evento_id: string) {
    setCarregando(true);
    setErro(null);

    const { data: equipesData } = await supabase
      .from("equipes")
      .select("id, nome")
      .eq("evento_id", evento_id);

    const equipes = (equipesData as Pick<Equipe, "id" | "nome">[]) ?? [];
    const idsEquipes = equipes.map((e) => e.id);

    if (idsEquipes.length === 0) {
      setAtletas([]);
      setCarregando(false);
      return;
    }

    const { data: atletasData, error } = await supabase
      .from("atletas")
      .select("*")
      .in("equipe_id", idsEquipes)
      .order("aprovado")
      .order("criado_em");

    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }

    const nomePorEquipe = new Map(equipes.map((e) => [e.id, e.nome]));
    const combinados = ((atletasData as Atleta[]) ?? []).map((atleta) => ({
      ...atleta,
      equipe_nome: nomePorEquipe.get(atleta.equipe_id) ?? "-",
    }));

    setAtletas(combinados);
    setCarregando(false);
  }

  async function aprovar(atletaId: string) {
    setErro(null);
    const { error } = await supabase.from("atletas").update({ aprovado: true }).eq("id", atletaId);
    if (error) {
      setErro(error.message);
      return;
    }
    setAtletas((atual) =>
      atual.map((atleta) => (atleta.id === atletaId ? { ...atleta, aprovado: true } : atleta))
    );
  }

  const pendentes = atletas.filter((a) => !a.aprovado);
  const aprovados = atletas.filter((a) => a.aprovado);

  return (
    <Layout>
      <PageHeader title="Atletas" subtitle="Aprovacao de vinculos de atletas as equipes" />

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">Evento</label>
        <SeletorEvento eventos={eventos} eventoId={eventoId} onChange={setEventoId} />
      </div>

      {erro && <p className="text-sm text-ps-vermelho mb-4">{erro}</p>}
      {carregando && <p className="text-sm text-slate-500">Carregando...</p>}

      {!carregando && eventoId && atletas.length === 0 && (
        <p className="text-sm text-slate-500">Nenhum atleta vinculado a equipes deste evento ainda.</p>
      )}

      {pendentes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-ps-azul-escuro mb-3">
            Pendentes de aprovacao ({pendentes.length})
          </h2>
          <div className="space-y-2">
            {pendentes.map((atleta) => (
              <div
                key={atleta.id}
                className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium text-ps-azul-escuro">
                    #{atleta.numero_camisa ?? "-"} — {atleta.equipe_nome}
                  </div>
                  <div className="text-xs text-slate-400">{atleta.posicao ?? "posicao nao informada"}</div>
                </div>
                <button
                  onClick={() => aprovar(atleta.id)}
                  className="rounded-lg bg-ps-dourado text-ps-azul-escuro font-semibold px-4 py-1.5 text-sm hover:brightness-95"
                >
                  Aprovar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {aprovados.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-ps-azul-escuro mb-3">Aprovados ({aprovados.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {aprovados.map((atleta) => (
              <div key={atleta.id} className="bg-white rounded-lg border border-slate-100 shadow-sm p-4">
                <div className="text-sm font-medium text-ps-azul-escuro">
                  #{atleta.numero_camisa ?? "-"} — {atleta.equipe_nome}
                </div>
                <div className="text-xs text-slate-400">{atleta.posicao ?? "posicao nao informada"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
