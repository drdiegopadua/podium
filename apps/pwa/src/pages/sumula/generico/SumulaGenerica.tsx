import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PwaLayout } from "../../../components/PwaLayout";
import { supabase } from "../../../lib/supabaseClient";
import type {
  Atleta,
  Equipe,
  Esporte,
  Jogo,
  Sumula,
  SumulaSchema,
  SumulaSchemaBasquete,
  SumulaSchemaVolei,
} from "@podium/shared";

interface SetPlacar {
  pontos_a: number;
  pontos_b: number;
}

interface DadosSumula {
  sets?: SetPlacar[];
  set_atual?: number;
  sets_vencidos_a?: number;
  sets_vencidos_b?: number;
  periodo_atual?: number;
  placar_a?: number;
  placar_b?: number;
}

type EstatisticasPorAtleta = Record<string, Record<string, number>>;

function ehSchemaVolei(schema: SumulaSchema): schema is SumulaSchemaVolei {
  return "sets" in schema;
}

function ehSchemaPeriodos(schema: SumulaSchema): schema is SumulaSchemaBasquete {
  return "periodos" in schema;
}

export function SumulaGenerica() {
  const { jogoId } = useParams<{ jogoId: string }>();

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [jogo, setJogo] = useState<Jogo | null>(null);
  const [equipeA, setEquipeA] = useState<Equipe | null>(null);
  const [equipeB, setEquipeB] = useState<Equipe | null>(null);
  const [esporte, setEsporte] = useState<Esporte | null>(null);
  const [atletasA, setAtletasA] = useState<Atleta[]>([]);
  const [atletasB, setAtletasB] = useState<Atleta[]>([]);
  const [sumula, setSumula] = useState<Sumula | null>(null);
  const [dados, setDados] = useState<DadosSumula>({});
  const [estatisticas, setEstatisticas] = useState<EstatisticasPorAtleta>({});

  useEffect(() => {
    if (!jogoId) return;

    async function carregar() {
      try {
        const { data: jogoData, error: erroJogo } = await supabase
          .from("jogos")
          .select("*")
          .eq("id", jogoId)
          .single();
        if (erroJogo || !jogoData) throw new Error("Jogo nao encontrado.");
        setJogo(jogoData);

        const [{ data: eqA }, { data: eqB }, { data: evento }] = await Promise.all([
          supabase.from("equipes").select("*").eq("id", jogoData.equipe_a_id).single(),
          supabase.from("equipes").select("*").eq("id", jogoData.equipe_b_id).single(),
          supabase.from("eventos").select("esporte_id").eq("id", jogoData.evento_id).single(),
        ]);
        setEquipeA(eqA ?? null);
        setEquipeB(eqB ?? null);

        const { data: esporteData, error: erroEsporte } = await supabase
          .from("esportes")
          .select("*")
          .eq("id", evento?.esporte_id)
          .single();
        if (erroEsporte || !esporteData) throw new Error("Esporte do evento nao encontrado.");
        setEsporte(esporteData);

        const [{ data: listaA }, { data: listaB }] = await Promise.all([
          supabase.from("atletas").select("*").eq("equipe_id", jogoData.equipe_a_id).eq("aprovado", true),
          supabase.from("atletas").select("*").eq("equipe_id", jogoData.equipe_b_id).eq("aprovado", true),
        ]);
        setAtletasA(listaA ?? []);
        setAtletasB(listaB ?? []);

        let sumulaAtual: Sumula | null = null;
        const { data: sumulaExistente } = await supabase
          .from("sumulas")
          .select("*")
          .eq("jogo_id", jogoId)
          .maybeSingle();

        if (sumulaExistente) {
          sumulaAtual = sumulaExistente;
        } else {
          const dadosIniciais = criarDadosIniciais(esporteData.configuracao_sumula);
          const { data: novaSumula, error: erroCriar } = await supabase
            .from("sumulas")
            .insert({
              jogo_id: jogoId,
              esporte_id: esporteData.id,
              dados: dadosIniciais,
              status: "aberta",
            })
            .select()
            .single();
          if (erroCriar) throw erroCriar;
          sumulaAtual = novaSumula;
        }
        setSumula(sumulaAtual);
        setDados((sumulaAtual?.dados as DadosSumula) ?? {});

        const { data: estatisticasExistentes } = await supabase
          .from("estatisticas_atletas")
          .select("*")
          .eq("sumula_id", sumulaAtual!.id);

        const mapa: EstatisticasPorAtleta = {};
        for (const linha of estatisticasExistentes ?? []) {
          mapa[linha.atleta_id] = linha.estatisticas as Record<string, number>;
        }
        setEstatisticas(mapa);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao carregar sumula.");
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, [jogoId]);

  async function persistirDados(novosDados: DadosSumula) {
    setDados(novosDados);
    if (!sumula) return;
    await supabase
      .from("sumulas")
      .update({ dados: novosDados, status: "em_andamento" })
      .eq("id", sumula.id);
  }

  async function persistirEstatistica(atletaId: string, campo: string, delta: number) {
    const atual = estatisticas[atletaId] ?? {};
    const novoValor = Math.max(0, (atual[campo] ?? 0) + delta);
    const novasEstatisticas = { ...atual, [campo]: novoValor };
    setEstatisticas((prev) => ({ ...prev, [atletaId]: novasEstatisticas }));

    if (!sumula) return;
    await supabase.from("estatisticas_atletas").upsert(
      { sumula_id: sumula.id, atleta_id: atletaId, estatisticas: novasEstatisticas },
      { onConflict: "sumula_id,atleta_id" }
    );
  }

  async function fecharSumula() {
    if (!sumula) return;
    const { data: usuario } = await supabase.auth.getUser();
    const { error } = await supabase.functions.invoke("fechar-sumula", {
      body: { sumula_id: sumula.id, arbitro_id: usuario.user?.id },
    });
    if (error) {
      setErro(error.message);
      return;
    }
    setSumula({ ...sumula, status: "fechada" });
  }

  if (carregando) {
    return (
      <PwaLayout>
        <div className="p-5 text-sm text-slate-500">Carregando sumula...</div>
      </PwaLayout>
    );
  }

  if (erro || !jogo || !esporte || !equipeA || !equipeB || !sumula) {
    return (
      <PwaLayout>
        <div className="p-5 text-sm text-ps-vermelho">{erro ?? "Nao foi possivel carregar a sumula."}</div>
      </PwaLayout>
    );
  }

  const schema = esporte.configuracao_sumula;
  const fechada = sumula.status === "fechada";

  return (
    <PwaLayout>
      <div className="p-5 space-y-6">
        <div>
          <h1 className="text-lg font-bold text-ps-azul-escuro">{esporte.nome}</h1>
          <p className="text-sm text-slate-500">
            {equipeA.nome} x {equipeB.nome}
          </p>
          {fechada && (
            <span className="inline-block mt-1 text-xs font-semibold text-ps-vermelho">
              SUMULA FECHADA
            </span>
          )}
        </div>

        {ehSchemaVolei(schema) && (
          <PlacarVolei
            schema={schema}
            dados={dados}
            desabilitado={fechada}
            equipeA={equipeA.nome}
            equipeB={equipeB.nome}
            onAlterar={persistirDados}
          />
        )}

        {!ehSchemaVolei(schema) && ehSchemaPeriodos(schema) && (
          <PlacarPeriodos
            schema={schema}
            dados={dados}
            desabilitado={fechada}
            equipeA={equipeA.nome}
            equipeB={equipeB.nome}
            onAlterar={persistirDados}
          />
        )}

        {!ehSchemaVolei(schema) && !ehSchemaPeriodos(schema) && (
          <PlacarSimples
            dados={dados}
            desabilitado={fechada}
            equipeA={equipeA.nome}
            equipeB={equipeB.nome}
            onAlterar={persistirDados}
          />
        )}

        <TabelaEstatisticas
          titulo={equipeA.nome}
          campos={schema.campos_por_atleta}
          atletas={atletasA}
          estatisticas={estatisticas}
          desabilitado={fechada}
          onAlterar={persistirEstatistica}
        />
        <TabelaEstatisticas
          titulo={equipeB.nome}
          campos={schema.campos_por_atleta}
          atletas={atletasB}
          estatisticas={estatisticas}
          desabilitado={fechada}
          onAlterar={persistirEstatistica}
        />

        {!fechada && (
          <button
            onClick={fecharSumula}
            className="w-full rounded-lg bg-ps-vermelho text-white font-semibold py-2.5 text-sm hover:brightness-95"
          >
            Fechar sumula
          </button>
        )}
      </div>
    </PwaLayout>
  );
}

function criarDadosIniciais(schema: SumulaSchema): DadosSumula {
  if (ehSchemaVolei(schema)) {
    return {
      sets: [{ pontos_a: 0, pontos_b: 0 }],
      set_atual: 0,
      sets_vencidos_a: 0,
      sets_vencidos_b: 0,
    };
  }
  if (ehSchemaPeriodos(schema)) {
    return { periodo_atual: 1, placar_a: 0, placar_b: 0 };
  }
  return { placar_a: 0, placar_b: 0 };
}

function ContadorPlacar({
  label,
  valor,
  desabilitado,
  onMenos,
  onMais,
}: {
  label: string;
  valor: number;
  desabilitado: boolean;
  onMenos: () => void;
  onMais: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-medium text-slate-500 truncate max-w-[7rem]">{label}</span>
      <span className="text-4xl font-bold text-ps-azul-escuro">{valor}</span>
      <div className="flex gap-2">
        <button
          disabled={desabilitado}
          onClick={onMenos}
          className="w-9 h-9 rounded-full bg-ps-cinza-claro text-ps-azul-escuro font-bold disabled:opacity-40"
        >
          −
        </button>
        <button
          disabled={desabilitado}
          onClick={onMais}
          className="w-9 h-9 rounded-full bg-ps-dourado text-ps-azul-escuro font-bold disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

function PlacarVolei({
  schema,
  dados,
  desabilitado,
  equipeA,
  equipeB,
  onAlterar,
}: {
  schema: SumulaSchemaVolei;
  dados: DadosSumula;
  desabilitado: boolean;
  equipeA: string;
  equipeB: string;
  onAlterar: (novosDados: DadosSumula) => void;
}) {
  const sets = dados.sets ?? [{ pontos_a: 0, pontos_b: 0 }];
  const setAtual = dados.set_atual ?? 0;
  const setsVencidosA = dados.sets_vencidos_a ?? 0;
  const setsVencidosB = dados.sets_vencidos_b ?? 0;
  const placarAtual = sets[setAtual] ?? { pontos_a: 0, pontos_b: 0 };

  const ultimoSet = setAtual === schema.sets.quantidade_max - 1;
  const pontosParaVencer = ultimoSet ? schema.sets.tie_break : schema.sets.pontos_por_set;
  const setsParaVencerPartida = Math.ceil(schema.sets.quantidade_max / 2);

  function alterarPonto(time: "a" | "b", delta: number) {
    const novosSets = [...sets];
    const atual = { ...novosSets[setAtual] };
    if (time === "a") atual.pontos_a = Math.max(0, atual.pontos_a + delta);
    else atual.pontos_b = Math.max(0, atual.pontos_b + delta);
    novosSets[setAtual] = atual;

    const venceu =
      delta > 0 &&
      Math.max(atual.pontos_a, atual.pontos_b) >= pontosParaVencer &&
      Math.abs(atual.pontos_a - atual.pontos_b) >= 2;

    let novosSetsVencidosA = setsVencidosA;
    let novosSetsVencidosB = setsVencidosB;
    let novoSetAtual = setAtual;

    if (venceu) {
      if (atual.pontos_a > atual.pontos_b) novosSetsVencidosA += 1;
      else novosSetsVencidosB += 1;

      const partidaDecidida =
        novosSetsVencidosA >= setsParaVencerPartida || novosSetsVencidosB >= setsParaVencerPartida;

      if (!partidaDecidida && setAtual + 1 < schema.sets.quantidade_max) {
        novoSetAtual = setAtual + 1;
        novosSets.push({ pontos_a: 0, pontos_b: 0 });
      }
    }

    onAlterar({
      ...dados,
      sets: novosSets,
      set_atual: novoSetAtual,
      sets_vencidos_a: novosSetsVencidosA,
      sets_vencidos_b: novosSetsVencidosB,
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="text-center text-xs text-slate-500 mb-3">
        Set {setAtual + 1} de {schema.sets.quantidade_max} — sets: {setsVencidosA} x {setsVencidosB}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <ContadorPlacar
          label={equipeA}
          valor={placarAtual.pontos_a}
          desabilitado={desabilitado}
          onMenos={() => alterarPonto("a", -1)}
          onMais={() => alterarPonto("a", 1)}
        />
        <ContadorPlacar
          label={equipeB}
          valor={placarAtual.pontos_b}
          desabilitado={desabilitado}
          onMenos={() => alterarPonto("b", -1)}
          onMais={() => alterarPonto("b", 1)}
        />
      </div>
    </div>
  );
}

function PlacarPeriodos({
  schema,
  dados,
  desabilitado,
  equipeA,
  equipeB,
  onAlterar,
}: {
  schema: SumulaSchemaBasquete;
  dados: DadosSumula;
  desabilitado: boolean;
  equipeA: string;
  equipeB: string;
  onAlterar: (novosDados: DadosSumula) => void;
}) {
  const periodoAtual = dados.periodo_atual ?? 1;
  const placarA = dados.placar_a ?? 0;
  const placarB = dados.placar_b ?? 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500">
          Periodo {periodoAtual} de {schema.periodos}
        </span>
        {!desabilitado && periodoAtual < schema.periodos && (
          <button
            onClick={() => onAlterar({ ...dados, periodo_atual: periodoAtual + 1 })}
            className="text-xs text-ps-azul-marinho underline"
          >
            Proximo periodo
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <ContadorPlacar
          label={equipeA}
          valor={placarA}
          desabilitado={desabilitado}
          onMenos={() => onAlterar({ ...dados, placar_a: Math.max(0, placarA - 1) })}
          onMais={() => onAlterar({ ...dados, placar_a: placarA + 1 })}
        />
        <ContadorPlacar
          label={equipeB}
          valor={placarB}
          desabilitado={desabilitado}
          onMenos={() => onAlterar({ ...dados, placar_b: Math.max(0, placarB - 1) })}
          onMais={() => onAlterar({ ...dados, placar_b: placarB + 1 })}
        />
      </div>
    </div>
  );
}

function PlacarSimples({
  dados,
  desabilitado,
  equipeA,
  equipeB,
  onAlterar,
}: {
  dados: DadosSumula;
  desabilitado: boolean;
  equipeA: string;
  equipeB: string;
  onAlterar: (novosDados: DadosSumula) => void;
}) {
  const placarA = dados.placar_a ?? 0;
  const placarB = dados.placar_b ?? 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="grid grid-cols-2 gap-6">
        <ContadorPlacar
          label={equipeA}
          valor={placarA}
          desabilitado={desabilitado}
          onMenos={() => onAlterar({ ...dados, placar_a: Math.max(0, placarA - 1) })}
          onMais={() => onAlterar({ ...dados, placar_a: placarA + 1 })}
        />
        <ContadorPlacar
          label={equipeB}
          valor={placarB}
          desabilitado={desabilitado}
          onMenos={() => onAlterar({ ...dados, placar_b: Math.max(0, placarB - 1) })}
          onMais={() => onAlterar({ ...dados, placar_b: placarB + 1 })}
        />
      </div>
    </div>
  );
}

function TabelaEstatisticas({
  titulo,
  campos,
  atletas,
  estatisticas,
  desabilitado,
  onAlterar,
}: {
  titulo: string;
  campos: string[];
  atletas: Atleta[];
  estatisticas: EstatisticasPorAtleta;
  desabilitado: boolean;
  onAlterar: (atletaId: string, campo: string, delta: number) => void;
}) {
  if (atletas.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
      <h2 className="text-sm font-semibold text-ps-azul-escuro mb-3">{titulo}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 text-left">
              <th className="pb-2 pr-2">Atleta</th>
              {campos.map((campo) => (
                <th key={campo} className="pb-2 px-1 text-center capitalize">
                  {campo.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {atletas.map((atleta) => (
              <tr key={atleta.id} className="border-t border-slate-100">
                <td className="py-2 pr-2 font-medium text-ps-azul-escuro whitespace-nowrap">
                  #{atleta.numero_camisa ?? "-"}
                </td>
                {campos.map((campo) => {
                  const valor = estatisticas[atleta.id]?.[campo] ?? 0;
                  return (
                    <td key={campo} className="py-2 px-1">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          disabled={desabilitado}
                          onClick={() => onAlterar(atleta.id, campo, -1)}
                          className="w-6 h-6 rounded-full bg-ps-cinza-claro text-ps-azul-escuro disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="w-5 text-center font-semibold">{valor}</span>
                        <button
                          disabled={desabilitado}
                          onClick={() => onAlterar(atleta.id, campo, 1)}
                          className="w-6 h-6 rounded-full bg-ps-dourado text-ps-azul-escuro disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
