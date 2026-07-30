import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Layout } from "../../../components/Layout";
import { PageHeader } from "../../../components/PageHeader";
import { supabase } from "../../../lib/supabaseClient";
import type { Equipe, Evento } from "@podium/shared";

type Fase = "configurar" | "embaralhando" | "revelado";

export function Sorteio() {
  const { id } = useParams<{ id: string }>();

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [equipes, setEquipes] = useState<Equipe[]>([]);

  const [qtdGrupos, setQtdGrupos] = useState(1);
  const [fase, setFase] = useState<Fase>("configurar");
  const [ordemEmbaralhada, setOrdemEmbaralhada] = useState<Equipe[]>([]);
  const [grupos, setGrupos] = useState<Record<string, Equipe[]>>({});
  const [sorteando, setSorteando] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function carregar() {
      const [{ data: eventoData, error: erroEvento }, { data: equipesData }] = await Promise.all([
        supabase.from("eventos").select("*").eq("id", id).single(),
        supabase.from("equipes").select("*").eq("evento_id", id).order("nome"),
      ]);
      if (erroEvento || !eventoData) {
        setErro("Evento nao encontrado.");
      } else {
        setEvento(eventoData);
        setEquipes(equipesData ?? []);
        setOrdemEmbaralhada(equipesData ?? []);
      }
      setCarregando(false);
    }
    carregar();
  }, [id]);

  function embaralharVisualmente(lista: Equipe[]): Equipe[] {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  async function iniciarSorteio() {
    if (!id) return;
    setErro(null);
    setSorteando(true);
    setFase("embaralhando");

    const ciclos = 8;
    for (let i = 0; i < ciclos; i++) {
      setOrdemEmbaralhada((atual) => embaralharVisualmente(atual));
      await new Promise((resolve) => setTimeout(resolve, 220));
    }

    try {
      const { error } = await supabase.functions.invoke("realizar-sorteio", {
        body: { evento_id: id, qtd_grupos: qtdGrupos },
      });
      if (error) throw error;

      const { data: equipesAtualizadas, error: erroEquipes } = await supabase
        .from("equipes")
        .select("*")
        .eq("evento_id", id);
      if (erroEquipes) throw erroEquipes;

      const agrupadas: Record<string, Equipe[]> = {};
      for (const equipe of equipesAtualizadas ?? []) {
        const grupo = equipe.posicao_grupo ?? "A";
        agrupadas[grupo] = agrupadas[grupo] ?? [];
        agrupadas[grupo].push(equipe);
      }
      setGrupos(agrupadas);
      setEquipes(equipesAtualizadas ?? []);
      setFase("revelado");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao realizar sorteio.");
      setFase("configurar");
    } finally {
      setSorteando(false);
    }
  }

  if (carregando) {
    return (
      <Layout>
        <p className="text-sm text-slate-500">Carregando...</p>
      </Layout>
    );
  }

  if (!evento) {
    return (
      <Layout>
        <p className="text-sm text-ps-vermelho">{erro ?? "Evento nao encontrado."}</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader title="Sorteio" subtitle={evento.nome} />

      {erro && <p className="text-sm text-ps-vermelho mb-4">{erro}</p>}

      {fase === "configurar" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 max-w-lg space-y-4">
          <p className="text-sm text-slate-600">
            {equipes.length} equipes inscritas. Escolha em quantos grupos elas serao divididas.
          </p>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">Quantidade de grupos</span>
            <input
              type="number"
              min={1}
              max={Math.min(8, equipes.length || 1)}
              value={qtdGrupos}
              onChange={(e) => setQtdGrupos(Number(e.target.value))}
              className="input max-w-[8rem]"
            />
          </label>
          <button
            onClick={iniciarSorteio}
            disabled={sorteando || equipes.length < 2}
            className="rounded-lg bg-ps-dourado text-ps-azul-escuro font-semibold px-5 py-2.5 text-sm hover:brightness-95 disabled:opacity-60"
          >
            Iniciar sorteio
          </button>
          {equipes.length < 2 && (
            <p className="text-xs text-slate-400">E preciso pelo menos 2 equipes para sortear.</p>
          )}
        </div>
      )}

      {fase === "embaralhando" && (
        <div className="bg-ps-azul-escuro rounded-2xl p-8">
          <p className="text-center text-ps-dourado text-sm font-semibold uppercase tracking-widest mb-6">
            Sorteando...
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <AnimatePresence>
              {ordemEmbaralhada.map((equipe) => (
                <motion.div
                  key={equipe.id}
                  layout
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="bg-white rounded-lg px-3 py-4 text-center text-xs font-semibold text-ps-azul-escuro"
                >
                  {equipe.nome}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {fase === "revelado" && (
        <div className="space-y-6">
          <div
            id="tela-final-sorteio"
            className="bg-ps-azul-escuro rounded-2xl p-8 max-w-md mx-auto aspect-[4/5] flex flex-col"
          >
            <div className="text-center mb-6">
              <div className="text-lg font-bold text-white">
                <span className="text-ps-dourado">PODIUM</span>
              </div>
              <p className="text-xs text-ps-cinza mt-1">{evento.nome}</p>
            </div>
            <div className="flex-1 grid grid-cols-1 gap-4 overflow-y-auto">
              {Object.entries(grupos)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([grupo, times], indiceGrupo) => (
                  <motion.div
                    key={grupo}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: indiceGrupo * 0.15 }}
                    className="bg-white/5 rounded-xl p-3"
                  >
                    <div className="text-ps-dourado text-xs font-bold uppercase tracking-wide mb-2">
                      Grupo {grupo}
                    </div>
                    <div className="space-y-1">
                      {times.map((equipe, indiceTime) => (
                        <motion.div
                          key={equipe.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: indiceGrupo * 0.15 + indiceTime * 0.08 + 0.1 }}
                          className="text-white text-sm bg-ps-azul-marinho rounded-md px-3 py-1.5"
                        >
                          {equipe.nome}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
          <p className="text-center text-xs text-slate-400">
            Print ou grave a tela acima para compartilhar o resultado.
          </p>
        </div>
      )}
    </Layout>
  );
}
