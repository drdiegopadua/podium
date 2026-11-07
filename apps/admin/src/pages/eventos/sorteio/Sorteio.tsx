import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Layout } from "../../../components/Layout";
import { PageHeader } from "../../../components/PageHeader";
import { supabase } from "../../../lib/supabaseClient";
import type { Equipe, Evento } from "@arena/shared";

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
        setQtdGrupos(Math.max(1, Number(eventoData.regras?.qtd_grupos) || 1));
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
      // Sorteio feito no proprio painel: embaralha e distribui as equipes nos grupos.
      // Os jogos sao gerados depois, em "Tabela de jogos".
      const letras = "ABCDEFGHIJKLMNOP".slice(0, Math.max(1, qtdGrupos)).split("");
      const sorteadas = embaralharVisualmente(equipes);
      const resultados = await Promise.all(
        sorteadas.map((equipe, i) =>
          supabase.from("equipes").update({ posicao_grupo: letras[i % letras.length] }).eq("id", equipe.id)
        )
      );
      const falha = resultados.find((r) => r.error);
      if (falha?.error) throw falha.error;
      await supabase.from("eventos").update({ status: "sorteio_realizado" }).eq("id", id);

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
        <p className="text-sm text-cinza">Carregando...</p>
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
        <div className="bg-cartao rounded-2xl shadow-sm border border-borda p-6 max-w-lg space-y-4">
          <p className="text-sm text-white/80">
            {equipes.length} equipes inscritas. Escolha em quantos grupos elas serao divididas.
          </p>
          <label className="block">
            <span className="block text-sm font-medium text-white/80 mb-1">Quantidade de grupos</span>
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
            className="rounded-full bg-destaque text-preto font-semibold px-5 py-2.5 text-sm hover:brightness-95 disabled:opacity-60"
          >
            Iniciar sorteio
          </button>
          {equipes.length < 2 && (
            <p className="text-xs text-cinza">E preciso pelo menos 2 equipes para sortear.</p>
          )}
        </div>
      )}

      {fase === "embaralhando" && (
        <div className="bg-fundo rounded-2xl p-8">
          <p className="text-center text-destaque text-sm font-semibold uppercase tracking-widest mb-6">
            Sorteando...
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <AnimatePresence>
              {ordemEmbaralhada.map((equipe) => (
                <motion.div
                  key={equipe.id}
                  layout
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="bg-cartao rounded-lg px-3 py-4 text-center text-xs font-semibold text-white"
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
            className="bg-fundo rounded-2xl p-8 max-w-md mx-auto aspect-[4/5] flex flex-col"
          >
            <div className="text-center mb-6">
              <div className="text-lg font-bold text-white">
                <span className="text-destaque">ARENA SPORTS</span>
              </div>
              <p className="text-xs text-cinza mt-1">{evento.nome}</p>
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
                    className="bg-white/5 rounded-2xl p-3"
                  >
                    <div className="text-destaque text-xs font-bold uppercase tracking-wide mb-2">
                      Grupo {grupo}
                    </div>
                    <div className="space-y-1">
                      {times.map((equipe, indiceTime) => (
                        <motion.div
                          key={equipe.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: indiceGrupo * 0.15 + indiceTime * 0.08 + 0.1 }}
                          className="text-white text-sm bg-cartao-2 rounded-md px-3 py-1.5"
                        >
                          {equipe.nome}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
          <p className="text-center text-xs text-cinza">
            Print ou grave a tela acima para compartilhar o resultado.
          </p>
        </div>
      )}
    </Layout>
  );
}
