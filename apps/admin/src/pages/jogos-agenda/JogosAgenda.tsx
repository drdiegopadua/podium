import { useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { SeletorEvento, useEventoSelecionado } from "../../components/SeletorEvento";
import { supabase } from "../../lib/supabaseClient";
import type { Equipe, Jogo, Perfil, StatusJogo } from "@podium/shared";

const STATUS_OPCOES: StatusJogo[] = ["agendado", "em_andamento", "encerrado", "wo"];

export function JogosAgenda() {
  const { eventos, eventoId, setEventoId } = useEventoSelecionado();
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [nomesEquipes, setNomesEquipes] = useState<Record<string, string>>({});
  const [arbitros, setArbitros] = useState<Perfil[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  useEffect(() => {
    if (!eventoId) {
      setJogos([]);
      setCarregando(false);
      return;
    }
    carregar(eventoId);
  }, [eventoId]);

  async function carregar(evento_id: string) {
    setCarregando(true);
    setErro(null);

    const [{ data: jogosData, error }, { data: equipesData }, { data: perfisData }] = await Promise.all([
      supabase.from("jogos").select("*").eq("evento_id", evento_id).order("data_hora"),
      supabase.from("equipes").select("id, nome").eq("evento_id", evento_id),
      supabase.from("perfis").select("*").in("tipo", ["arbitro", "gestor_evento", "super_admin"]),
    ]);

    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }

    const mapa: Record<string, string> = {};
    for (const equipe of (equipesData as Pick<Equipe, "id" | "nome">[]) ?? []) {
      mapa[equipe.id] = equipe.nome;
    }
    setNomesEquipes(mapa);
    setArbitros((perfisData as Perfil[]) ?? []);
    setJogos((jogosData as Jogo[]) ?? []);
    setCarregando(false);
  }

  function atualizarLocal(jogoId: string, alteracoes: Partial<Jogo>) {
    setJogos((atual) => atual.map((jogo) => (jogo.id === jogoId ? { ...jogo, ...alteracoes } : jogo)));
  }

  async function salvar(jogo: Jogo) {
    setSalvandoId(jogo.id);
    setErro(null);
    const { error } = await supabase
      .from("jogos")
      .update({
        data_hora: jogo.data_hora,
        local: jogo.local,
        arbitro_id: jogo.arbitro_id,
        placar_a: jogo.placar_a,
        placar_b: jogo.placar_b,
        status: jogo.status,
      })
      .eq("id", jogo.id);
    setSalvandoId(null);
    if (error) setErro(error.message);
  }

  return (
    <Layout>
      <PageHeader title="Jogos & Agenda" subtitle="Agendamento, designacao de arbitros e placares" />

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">Evento</label>
        <SeletorEvento eventos={eventos} eventoId={eventoId} onChange={setEventoId} />
      </div>

      {erro && <p className="text-sm text-ps-vermelho mb-4">{erro}</p>}
      {carregando && <p className="text-sm text-slate-500">Carregando...</p>}

      {!carregando && eventoId && jogos.length === 0 && (
        <p className="text-sm text-slate-500">
          Nenhum jogo agendado ainda. Rode o sorteio no evento para gerar os jogos.
        </p>
      )}

      <div className="space-y-3">
        {jogos.map((jogo) => (
          <div key={jogo.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-ps-azul-escuro">
                {nomesEquipes[jogo.equipe_a_id] ?? "?"} x {nomesEquipes[jogo.equipe_b_id] ?? "?"}
              </div>
              {jogo.fase && <span className="text-xs text-ps-dourado font-semibold">{jogo.fase}</span>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="block">
                <span className="block text-xs text-slate-500 mb-1">Data/hora</span>
                <input
                  type="datetime-local"
                  value={jogo.data_hora ? jogo.data_hora.slice(0, 16) : ""}
                  onChange={(e) =>
                    atualizarLocal(jogo.id, {
                      data_hora: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                  className="input text-xs"
                />
              </label>

              <label className="block">
                <span className="block text-xs text-slate-500 mb-1">Local</span>
                <input
                  value={jogo.local ?? ""}
                  onChange={(e) => atualizarLocal(jogo.id, { local: e.target.value })}
                  className="input text-xs"
                />
              </label>

              <label className="block">
                <span className="block text-xs text-slate-500 mb-1">Arbitro</span>
                <select
                  value={jogo.arbitro_id ?? ""}
                  onChange={(e) => atualizarLocal(jogo.id, { arbitro_id: e.target.value || null })}
                  className="input text-xs"
                >
                  <option value="">Nao designado</option>
                  {arbitros.map((perfil) => (
                    <option key={perfil.id} value={perfil.id}>
                      {perfil.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-xs text-slate-500 mb-1">Status</span>
                <select
                  value={jogo.status}
                  onChange={(e) => atualizarLocal(jogo.id, { status: e.target.value as StatusJogo })}
                  className="input text-xs"
                >
                  {STATUS_OPCOES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-xs text-slate-500 mb-1">Placar {nomesEquipes[jogo.equipe_a_id] ?? "A"}</span>
                <input
                  type="number"
                  min={0}
                  value={jogo.placar_a ?? ""}
                  onChange={(e) =>
                    atualizarLocal(jogo.id, { placar_a: e.target.value ? Number(e.target.value) : null })
                  }
                  className="input text-xs"
                />
              </label>

              <label className="block">
                <span className="block text-xs text-slate-500 mb-1">Placar {nomesEquipes[jogo.equipe_b_id] ?? "B"}</span>
                <input
                  type="number"
                  min={0}
                  value={jogo.placar_b ?? ""}
                  onChange={(e) =>
                    atualizarLocal(jogo.id, { placar_b: e.target.value ? Number(e.target.value) : null })
                  }
                  className="input text-xs"
                />
              </label>
            </div>

            <button
              onClick={() => salvar(jogo)}
              disabled={salvandoId === jogo.id}
              className="mt-3 rounded-lg bg-ps-dourado text-ps-azul-escuro font-semibold px-4 py-1.5 text-xs hover:brightness-95 disabled:opacity-60"
            >
              {salvandoId === jogo.id ? "Salvando..." : "Salvar"}
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}
