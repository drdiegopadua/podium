import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FORMATOS_EVENTO,
  REGRAS_PADRAO,
  classificacaoPorGrupo,
  gerarChave,
  gerarClassificatoria,
  montarGrupos,
  paresDosGrupos,
  semearPares,
  type Evento,
  type Jogo,
  type LinhaClassificacao,
  type NovoJogo,
  type RegrasEvento,
} from "@arena/shared";
import { Layout } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { SeletorEvento, useEventoSelecionado } from "../../components/SeletorEvento";
import { supabase } from "../../lib/supabaseClient";
import { useSessao } from "../../contexts/SessaoContext";
import { ModalResultado, Escudo, type EquipeMini, type PessoaMini } from "./ModalResultado";

const STATUS_ROTULO: Record<string, string> = {
  agendado: "Agendado",
  em_andamento: "Ao vivo",
  encerrado: "Encerrado",
  wo: "W.O.",
};

function embaralhar<T>(lista: T[]): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function JogosAgenda() {
  const { empresaAtual } = useSessao();
  const { eventos, eventoId, setEventoId } = useEventoSelecionado();
  const evento = eventos.find((e) => e.id === eventoId) as Evento | undefined;
  const regras: RegrasEvento = { ...REGRAS_PADRAO, ...(evento?.regras ?? {}) };

  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [equipes, setEquipes] = useState<EquipeMini[]>([]);
  const [arbitros, setArbitros] = useState<PessoaMini[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [jogoAberto, setJogoAberto] = useState<Jogo | null>(null);

  const carregar = useCallback(async (id: string) => {
    setCarregando(true);
    setErro(null);
    const [{ data: j, error }, { data: eq }] = await Promise.all([
      supabase.from("jogos").select("*").eq("evento_id", id).order("ordem", { nullsFirst: false }).order("data_hora"),
      supabase.from("equipes").select("id, nome, logo_url, posicao_grupo").eq("evento_id", id).order("nome"),
    ]);
    if (error) setErro(error.message);
    setJogos((j as Jogo[]) ?? []);
    setEquipes((eq as EquipeMini[]) ?? []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (!eventoId) {
      setJogos([]);
      setCarregando(false);
      return;
    }
    carregar(eventoId);
  }, [eventoId, carregar]);

  useEffect(() => {
    if (!empresaAtual) return;
    supabase
      .from("membros_empresa")
      .select("perfil_id, papel, perfil:perfis(nome)")
      .eq("empresa_id", empresaAtual.id)
      .then(({ data }) =>
        setArbitros(
          ((data as unknown as { perfil_id: string; perfil: { nome: string } | null }[]) ?? []).map((m) => ({
            id: m.perfil_id,
            nome: m.perfil?.nome ?? "Sem nome",
          }))
        )
      );
  }, [empresaAtual]);

  const equipePorId = useMemo(() => new Map(equipes.map((e) => [e.id, e])), [equipes]);
  const classificatorios = useMemo(
    () => jogos.filter((j) => (j.etapa ?? "classificatoria") === "classificatoria"),
    [jogos]
  );
  const mataMata = useMemo(() => jogos.filter((j) => j.etapa === "mata_mata"), [jogos]);
  const temMataMata = evento ? evento.formato !== "pontos_corridos" && evento.formato !== "pontos_corridos_ida_volta" : false;
  const classifTerminada =
    classificatorios.length > 0 && classificatorios.every((j) => j.status === "encerrado" || j.status === "wo");

  async function inserirJogos(novos: NovoJogo[]) {
    if (novos.length === 0) throw new Error("Nenhum jogo para gerar. Confira se há equipes suficientes.");
    const { error } = await supabase.from("jogos").insert(novos);
    if (error) throw error;
  }

  async function gerarTabela() {
    if (!evento) return;
    if (equipes.length < 2) {
      setErro("Cadastre pelo menos 2 equipes antes de gerar a tabela.");
      return;
    }
    const resumo = FORMATOS_EVENTO.find((f) => f.valor === evento.formato)?.rotulo;
    if (!confirm(`Gerar a tabela de jogos (${resumo}) com ${equipes.length} equipes?`)) return;
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      if (evento.formato === "mata_mata") {
        await inserirJogos(
          gerarChave({
            eventoId: evento.id,
            pares: semearPares(embaralhar(equipes.map((e) => e.id))),
            terceiroLugar: !!regras.disputa_terceiro,
          })
        );
      } else if (evento.formato === "grupos_mata_mata") {
        const grupos = montarGrupos(embaralhar(equipes), Math.max(1, regras.qtd_grupos ?? 2));
        // grava o grupo de quem ainda nao tinha (sorteio automatico)
        await Promise.all(
          grupos.flatMap((g) =>
            g.times
              .filter((id) => equipePorId.get(id)?.posicao_grupo !== g.nome)
              .map((id) => supabase.from("equipes").update({ posicao_grupo: g.nome }).eq("id", id))
          )
        );
        await inserirJogos(gerarClassificatoria({ eventoId: evento.id, grupos, idaVolta: false }));
      } else {
        await inserirJogos(
          gerarClassificatoria({
            eventoId: evento.id,
            grupos: [{ nome: null, times: embaralhar(equipes.map((e) => e.id)) }],
            idaVolta: evento.formato === "pontos_corridos_ida_volta",
          })
        );
      }
      await supabase.from("eventos").update({ status: "em_andamento" }).eq("id", evento.id);
      setAviso("Tabela gerada! Agora defina datas e locais e lance os resultados.");
      await carregar(evento.id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar a tabela.");
    } finally {
      setOcupado(false);
    }
  }

  async function gerarFaseFinal() {
    if (!evento) return;
    if (
      !classifTerminada &&
      !confirm("Ainda há jogos da fase classificatória sem resultado. Gerar o mata-mata mesmo assim?")
    )
      return;
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      const { data } = await supabase
        .from("classificacao")
        .select("*, equipe:equipes(nome, logo_url)")
        .eq("evento_id", evento.id);
      const tabelas = classificacaoPorGrupo((data as LinhaClassificacao[]) ?? [], regras.criterios_desempate, jogos);
      let pares: [string | null, string | null][];
      if (evento.formato === "grupos_mata_mata") {
        const k = Math.max(1, regras.classificados_por_grupo ?? 2);
        pares = paresDosGrupos(tabelas.map((t) => t.linhas.slice(0, k).map((l) => l.equipe_id)));
      } else {
        const n = Math.max(2, regras.classificados_playoff ?? 4);
        pares = semearPares((tabelas[0]?.linhas ?? []).slice(0, n).map((l) => l.equipe_id));
      }
      await inserirJogos(
        gerarChave({ eventoId: evento.id, pares, terceiroLugar: !!regras.disputa_terceiro, ordemInicial: 10000 })
      );
      setAviso("Mata-mata gerado com os classificados!");
      await carregar(evento.id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar o mata-mata.");
    } finally {
      setOcupado(false);
    }
  }

  async function apagar(etapa: "tudo" | "mata_mata") {
    if (!evento) return;
    const texto =
      etapa === "tudo"
        ? "Apagar TODA a tabela de jogos, com placares, gols e cartões? Isso não pode ser desfeito."
        : "Apagar os jogos do mata-mata (com placares, gols e cartões)? Isso não pode ser desfeito.";
    if (!confirm(texto)) return;
    setOcupado(true);
    let q = supabase.from("jogos").delete().eq("evento_id", evento.id);
    if (etapa === "mata_mata") q = q.eq("etapa", "mata_mata");
    const { error } = await q;
    setOcupado(false);
    if (error) setErro(error.message);
    await carregar(evento.id);
  }

  const blocos = useMemo(() => {
    const lista: { titulo: string; jogos: Jogo[] }[] = [];
    const porRodada = new Map<number, Jogo[]>();
    for (const j of classificatorios) {
      const r = j.rodada ?? 0;
      porRodada.set(r, [...(porRodada.get(r) ?? []), j]);
    }
    for (const [r, js] of [...porRodada.entries()].sort((a, b) => a[0] - b[0]))
      lista.push({ titulo: r ? `Rodada ${r}` : "Jogos", jogos: js });
    const porFase = new Map<string, Jogo[]>();
    for (const j of [...mataMata].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))) {
      const f = j.fase ?? "Mata-mata";
      porFase.set(f, [...(porFase.get(f) ?? []), j]);
    }
    for (const [f, js] of porFase) lista.push({ titulo: f, jogos: js });
    return lista;
  }, [classificatorios, mataMata]);

  const realizados = jogos.filter((j) => j.status === "encerrado" || j.status === "wo").length;

  return (
    <Layout>
      <PageHeader title="Tabela de jogos" subtitle="Gere os confrontos, agende e lance os resultados" />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">Torneio</label>
          <SeletorEvento eventos={eventos} eventoId={eventoId} onChange={setEventoId} />
        </div>
        {evento && jogos.length > 0 && (
          <div className="text-sm text-cinza">
            {realizados} de {jogos.length} jogos realizados
          </div>
        )}
        {evento && (
          <a
            href={`/imprimir/${evento.id}?doc=tabela`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto rounded-full border border-borda px-4 py-2 text-sm font-semibold hover:border-destaque"
          >
            🖨 Imprimir / PDF
          </a>
        )}
      </div>

      {erro && <p className="text-sm text-ps-vermelho mb-4">{erro}</p>}
      {aviso && <p className="text-sm text-destaque mb-4">{aviso}</p>}
      {carregando && <p className="text-sm text-cinza">Carregando...</p>}

      {!carregando && evento && jogos.length === 0 && (
        <div className="bg-cartao rounded-2xl border border-borda p-6 max-w-2xl space-y-3">
          <h2 className="font-bold text-lg">Gerar a tabela automaticamente</h2>
          <p className="text-sm text-white/80">
            Formato: <b>{FORMATOS_EVENTO.find((f) => f.valor === evento.formato)?.rotulo}</b> · {equipes.length}{" "}
            equipes cadastradas
            {evento.formato === "grupos_mata_mata" && ` · ${regras.qtd_grupos ?? 2} grupos`}
          </p>
          <p className="text-xs text-cinza">
            {evento.formato === "grupos_mata_mata"
              ? "Usa os grupos do sorteio; equipes sem grupo são distribuídas automaticamente. O mata-mata é gerado depois, com os classificados."
              : evento.formato === "mata_mata"
                ? "As equipes são sorteadas na chave. Se o número não for 4, 8, 16..., algumas passam direto para a fase seguinte."
                : evento.formato === "pontos_corridos_mata_mata"
                  ? "Todos contra todos; depois os melhores colocados vão para os playoffs."
                  : "Todos jogam contra todos, rodada por rodada."}
          </p>
          <button
            onClick={gerarTabela}
            disabled={ocupado || equipes.length < 2}
            className="rounded-full bg-destaque text-preto font-semibold px-6 py-2.5 text-sm disabled:opacity-50"
          >
            {ocupado ? "Gerando..." : "⚡ Gerar tabela de jogos"}
          </button>
          {equipes.length < 2 && <p className="text-xs text-ps-vermelho">Cadastre as equipes primeiro.</p>}
        </div>
      )}

      {jogos.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {temMataMata && evento?.formato !== "mata_mata" && mataMata.length === 0 && (
            <button
              onClick={gerarFaseFinal}
              disabled={ocupado}
              className={`rounded-full font-semibold px-5 py-2 text-sm disabled:opacity-50 ${
                classifTerminada ? "bg-destaque text-preto" : "bg-cartao-2 border border-borda text-white"
              }`}
            >
              🏆 Gerar mata-mata com os classificados
            </button>
          )}
          {mataMata.length > 0 && evento?.formato !== "mata_mata" && (
            <button onClick={() => apagar("mata_mata")} disabled={ocupado} className="text-xs text-cinza underline">
              Refazer mata-mata
            </button>
          )}
          <button onClick={() => apagar("tudo")} disabled={ocupado} className="text-xs text-ps-vermelho underline">
            Apagar tabela
          </button>
        </div>
      )}

      <div className="space-y-8 max-w-4xl">
        {blocos.map((b) => (
          <section key={b.titulo}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-cinza mb-2">{b.titulo}</h2>
            <div className="space-y-2">
              {b.jogos.map((j) => (
                <LinhaJogo key={j.id} jogo={j} equipes={equipePorId} onAbrir={() => setJogoAberto(j)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {jogoAberto && evento && (
        <ModalResultado
          jogo={jogoAberto}
          evento={evento}
          equipes={equipePorId}
          arbitros={arbitros}
          onFechar={() => setJogoAberto(null)}
          onSalvo={async () => {
            setJogoAberto(null);
            await carregar(evento.id);
          }}
        />
      )}
    </Layout>
  );
}

function LinhaJogo({
  jogo,
  equipes,
  onAbrir,
}: {
  jogo: Jogo;
  equipes: Map<string, EquipeMini>;
  onAbrir: () => void;
}) {
  const a = jogo.equipe_a_id ? equipes.get(jogo.equipe_a_id) : null;
  const b = jogo.equipe_b_id ? equipes.get(jogo.equipe_b_id) : null;
  const feito = jogo.status === "encerrado" || jogo.status === "wo";
  const pronto = !!(a && b);
  return (
    <button
      type="button"
      onClick={onAbrir}
      disabled={!pronto}
      className="w-full text-left bg-cartao rounded-2xl border border-borda px-4 py-3 hover:border-destaque disabled:hover:border-borda disabled:opacity-70 grid grid-cols-[110px_1fr_auto_1fr_96px] items-center gap-3"
    >
      <span className="text-xs text-cinza leading-tight">
        {jogo.data_hora
          ? new Date(jogo.data_hora).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Sem data"}
        {jogo.local && <span className="block truncate">{jogo.local}</span>}
        {jogo.grupo && <span className="block text-destaque">Grupo {jogo.grupo}</span>}
      </span>
      <Time equipe={a} lado="a" />
      <span className="text-center font-extrabold tabular-nums min-w-[64px]">
        {feito || jogo.status === "em_andamento" ? (
          <>
            {jogo.placar_a ?? 0} <span className="text-cinza font-normal">×</span> {jogo.placar_b ?? 0}
            {jogo.penaltis_a != null && jogo.penaltis_b != null && (
              <span className="block text-[10px] text-cinza font-normal">
                pên. {jogo.penaltis_a}–{jogo.penaltis_b}
              </span>
            )}
          </>
        ) : (
          <span className="text-cinza font-normal">×</span>
        )}
      </span>
      <Time equipe={b} lado="b" />
      <span
        className={`text-xs text-right font-semibold ${
          jogo.status === "em_andamento" ? "text-ps-vermelho" : feito ? "text-destaque" : "text-cinza"
        }`}
      >
        {pronto ? STATUS_ROTULO[jogo.status] : "Aguardando"}
        {pronto && <span className="block font-normal text-cinza">{feito ? "Editar ›" : "Lançar ›"}</span>}
      </span>
    </button>
  );
}

function Time({ equipe, lado }: { equipe?: EquipeMini | null; lado: "a" | "b" }) {
  return (
    <span className={`flex items-center gap-2 min-w-0 ${lado === "a" ? "justify-end text-right" : ""}`}>
      {lado === "b" && <Escudo equipe={equipe} />}
      <span className={`truncate text-sm font-semibold ${equipe ? "" : "text-cinza font-normal"}`}>
        {equipe?.nome ?? "A definir"}
      </span>
      {lado === "a" && <Escudo equipe={equipe} />}
    </span>
  );
}
