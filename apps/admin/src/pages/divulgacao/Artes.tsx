import { useEffect, useMemo, useRef, useState } from "react";
import {
  REGRAS_PADRAO,
  classificacaoPorGrupo,
  type Evento,
  type Jogo,
  type Lance,
  type LinhaClassificacao,
} from "@arena/shared";
import { Layout } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { SeletorEvento, useEventoSelecionado } from "../../components/SeletorEvento";
import { supabase } from "../../lib/supabaseClient";
import { useSessao } from "../../contexts/SessaoContext";
import { URL_PWA, linkTorneioNoApp } from "../../lib/config";
import {
  DIMENSOES,
  arteClassificacao,
  arteProximos,
  arteRanking,
  arteResultado,
  baixar,
  compartilhar,
  type Cabecalho,
  type FormatoArte,
} from "../../lib/artes";

type TipoArte = "resultado" | "classificacao" | "artilharia" | "proximos";
interface EquipeMini {
  id: string;
  nome: string;
  logo_url?: string | null;
}

const TIPOS: { id: TipoArte; rotulo: string; icone: string }[] = [
  { id: "resultado", rotulo: "Resultado do jogo", icone: "⚽" },
  { id: "classificacao", rotulo: "Classificação", icone: "📊" },
  { id: "artilharia", rotulo: "Artilharia", icone: "🥇" },
  { id: "proximos", rotulo: "Próximos jogos", icone: "📅" },
];

const fmtData = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "Data a definir";

export function Artes() {
  const { empresaAtual } = useSessao();
  const { eventos, eventoId, setEventoId } = useEventoSelecionado();
  const evento = eventos.find((e) => e.id === eventoId) as Evento | undefined;

  const [equipes, setEquipes] = useState<EquipeMini[]>([]);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [linhas, setLinhas] = useState<LinhaClassificacao[]>([]);
  const [lances, setLances] = useState<Lance[]>([]);

  const [tipo, setTipo] = useState<TipoArte>("resultado");
  const [formato, setFormato] = useState<FormatoArte>("feed");
  const [jogoId, setJogoId] = useState("");
  const [grupo, setGrupo] = useState("");
  const [rodada, setRodada] = useState<string>("proximos");
  const [previa, setPrevia] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!eventoId) return;
    Promise.all([
      supabase.from("equipes").select("id, nome, logo_url").eq("evento_id", eventoId),
      supabase.from("jogos").select("*").eq("evento_id", eventoId),
      supabase.from("classificacao").select("*, equipe:equipes(nome, logo_url)").eq("evento_id", eventoId),
      supabase.from("lances").select("*").eq("evento_id", eventoId),
    ]).then(([e, j, c, l]) => {
      setEquipes((e.data as EquipeMini[]) ?? []);
      const lista = ((j.data as Jogo[]) ?? []).sort(
        (a, b) => (b.data_hora ?? "").localeCompare(a.data_hora ?? "") || (b.ordem ?? 0) - (a.ordem ?? 0)
      );
      setJogos(lista);
      setLinhas((c.data as LinhaClassificacao[]) ?? []);
      setLances((l.data as Lance[]) ?? []);
      setJogoId(lista.find((x) => x.status === "encerrado" || x.status === "wo")?.id ?? "");
    });
  }, [eventoId]);

  const equipePorId = useMemo(() => new Map(equipes.map((e) => [e.id, e])), [equipes]);
  const encerrados = jogos.filter((j) => (j.status === "encerrado" || j.status === "wo") && j.equipe_a_id && j.equipe_b_id);
  const regras = { ...REGRAS_PADRAO, ...(evento?.regras ?? {}) };
  const tabelas = classificacaoPorGrupo(linhas, regras.criterios_desempate, jogos);
  const rodadas = Array.from(new Set(jogos.filter((j) => j.status === "agendado").map((j) => (j.etapa === "mata_mata" ? j.fase ?? "" : `Rodada ${j.rodada}`))));

  const cab: Cabecalho | null = evento
    ? {
        torneio: evento.nome,
        empresa: empresaAtual?.nome ?? "",
        logoTorneio: evento.logo_url ?? empresaAtual?.logo_url ?? null,
        destaque: empresaAtual?.cor_secundaria || "#D4FF3A",
        rodape: linkTorneioNoApp(evento.codigo_evento).replace(/^https?:\/\//, ""),
      }
    : null;

  async function gerar() {
    if (!evento || !cab) return;
    setGerando(true);
    setMsg(null);
    try {
      let canvas: HTMLCanvasElement | null = null;
      if (tipo === "resultado") {
        const j = jogos.find((x) => x.id === jogoId);
        if (!j) throw new Error("Escolha um jogo encerrado.");
        const a = equipePorId.get(j.equipe_a_id ?? "")!;
        const b = equipePorId.get(j.equipe_b_id ?? "")!;
        const gols = (eq: string, outra: string) =>
          lances
            .filter((l) => l.jogo_id === j.id && ((l.tipo === "gol" && l.equipe_id === eq) || (l.tipo === "gol_contra" && l.equipe_id === outra)))
            .map((l) => `${l.jogador_nome ?? ""}${l.tipo === "gol_contra" ? " (contra)" : ""}${l.quantidade > 1 ? ` (${l.quantidade})` : ""}`.trim());
        canvas = await arteResultado({
          formato,
          cab,
          fase: j.fase ?? "",
          a,
          b,
          placarA: j.placar_a ?? 0,
          placarB: j.placar_b ?? 0,
          penaltis: j.penaltis_a != null && j.penaltis_b != null ? [j.penaltis_a, j.penaltis_b] : null,
          wo: j.status === "wo",
          golsA: gols(a.id, b.id),
          golsB: gols(b.id, a.id),
          data: j.data_hora ? new Date(j.data_hora).toLocaleDateString("pt-BR") + (j.local ? ` · ${j.local}` : "") : j.local,
        });
      } else if (tipo === "classificacao") {
        const t = tabelas.find((x) => x.grupo === grupo) ?? tabelas[0];
        if (!t) throw new Error("A classificação ainda está vazia.");
        const zona =
          evento.formato === "grupos_mata_mata"
            ? regras.classificados_por_grupo ?? 0
            : evento.formato === "pontos_corridos_mata_mata"
              ? regras.classificados_playoff ?? 0
              : 1;
        canvas = await arteClassificacao({
          formato,
          cab,
          titulo: t.grupo ? `Grupo ${t.grupo}` : "Tabela geral",
          zona,
          linhas: t.linhas.map((l) => ({
            equipe: { nome: l.equipe?.nome ?? "", logo_url: l.equipe?.logo_url },
            pontos: l.pontos,
            jogos: l.jogos ?? 0,
            vitorias: l.vitorias,
            saldo: l.saldo,
          })),
        });
      } else if (tipo === "artilharia") {
        const mapa = new Map<string, { jogador: string; equipe: EquipeMini; total: number }>();
        for (const l of lances) {
          if (l.tipo !== "gol" || !l.jogador_nome) continue;
          const k = `${l.equipe_id}|${l.jogador_nome.toLowerCase()}`;
          const it = mapa.get(k) ?? { jogador: l.jogador_nome, equipe: equipePorId.get(l.equipe_id ?? "") ?? { id: "", nome: "" }, total: 0 };
          it.total += l.quantidade;
          mapa.set(k, it);
        }
        const itens = [...mapa.values()].sort((x, y) => y.total - x.total);
        if (itens.length === 0) throw new Error("Nenhum gol lançado ainda.");
        canvas = await arteRanking({ formato, cab, etiqueta: "ARTILHARIA", unidade: "GOLS", itens });
      } else {
        const agendados = jogos
          .filter((j) => j.status === "agendado" && j.equipe_a_id && j.equipe_b_id)
          .filter((j) => rodada === "proximos" || (j.etapa === "mata_mata" ? j.fase === rodada : `Rodada ${j.rodada}` === rodada))
          .sort((x, y) => (x.data_hora ?? "9999").localeCompare(y.data_hora ?? "9999") || (x.ordem ?? 0) - (y.ordem ?? 0));
        if (agendados.length === 0) throw new Error("Não há jogos agendados com as duas equipes definidas.");
        canvas = await arteProximos({
          formato,
          cab,
          titulo: rodada === "proximos" ? "" : rodada,
          jogos: agendados.map((j) => ({
            a: equipePorId.get(j.equipe_a_id!)!,
            b: equipePorId.get(j.equipe_b_id!)!,
            quando: fmtData(j.data_hora),
            local: j.local,
          })),
        });
      }
      canvasRef.current = canvas;
      setPrevia(canvas.toDataURL("image/png"));
    } catch (e) {
      setPrevia(null);
      setMsg(e instanceof Error ? e.message : "Erro ao gerar a arte.");
    } finally {
      setGerando(false);
    }
  }

  // gera automaticamente ao mudar as opcoes
  useEffect(() => {
    if (evento) gerar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, formato, jogoId, grupo, rodada, evento?.id, linhas, lances, jogos, equipes]);

  const nomeArquivo = `${(evento?.nome ?? "arte").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${tipo}-${formato}`;
  const legenda = evento
    ? `${evento.nome} — acompanhe jogos, placares e classificação ao vivo: ${linkTorneioNoApp(evento.codigo_evento)}`
    : "";

  return (
    <Layout>
      <PageHeader title="Artes para redes sociais" subtitle="Imagens prontas para Instagram, Stories e WhatsApp" />
      <div className="mb-6">
        <SeletorEvento eventos={eventos} eventoId={eventoId} onChange={setEventoId} />
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-6 items-start">
        <div className="bg-cartao rounded-2xl border border-borda p-5 space-y-5">
          <div>
            <span className="block text-sm font-medium text-white/80 mb-2">Tipo de arte</span>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTipo(t.id)}
                  className={`rounded-xl border px-3 py-3 text-sm text-left ${tipo === t.id ? "border-destaque bg-destaque/10" : "border-borda"}`}
                >
                  <span className="block text-lg">{t.icone}</span>
                  {t.rotulo}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-white/80 mb-2">Formato</span>
            <div className="flex gap-2">
              {(Object.keys(DIMENSOES) as FormatoArte[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormato(f)}
                  className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold ${formato === f ? "bg-destaque text-preto border-destaque" : "border-borda text-cinza"}`}
                >
                  {DIMENSOES[f].rotulo}
                </button>
              ))}
            </div>
          </div>

          {tipo === "resultado" && (
            <label className="block">
              <span className="block text-sm font-medium text-white/80 mb-1">Jogo</span>
              <select value={jogoId} onChange={(e) => setJogoId(e.target.value)} className="input">
                {encerrados.length === 0 && <option value="">Nenhum jogo encerrado</option>}
                {encerrados.map((j) => (
                  <option key={j.id} value={j.id}>
                    {equipePorId.get(j.equipe_a_id!)?.nome} {j.placar_a ?? 0} × {j.placar_b ?? 0} {equipePorId.get(j.equipe_b_id!)?.nome}
                    {j.fase ? ` — ${j.fase}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          {tipo === "classificacao" && tabelas.length > 1 && (
            <label className="block">
              <span className="block text-sm font-medium text-white/80 mb-1">Grupo</span>
              <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="input">
                {tabelas.map((t) => (
                  <option key={t.grupo} value={t.grupo}>
                    {t.grupo ? `Grupo ${t.grupo}` : "Tabela geral"}
                  </option>
                ))}
              </select>
            </label>
          )}
          {tipo === "proximos" && (
            <label className="block">
              <span className="block text-sm font-medium text-white/80 mb-1">Quais jogos</span>
              <select value={rodada} onChange={(e) => setRodada(e.target.value)} className="input">
                <option value="proximos">Próximos jogos (por data)</option>
                {rodadas.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          )}

          {msg && <p className="text-sm text-cinza">{msg}</p>}

          <div className="space-y-2 pt-1">
            <button
              disabled={!previa || gerando}
              onClick={() => canvasRef.current && baixar(canvasRef.current, nomeArquivo)}
              className="w-full rounded-full bg-destaque text-preto font-semibold py-2.5 text-sm disabled:opacity-50"
            >
              ⬇ Baixar imagem
            </button>
            <button
              disabled={!previa || gerando}
              onClick={async () => {
                if (!canvasRef.current) return;
                const ok = await compartilhar(canvasRef.current, nomeArquivo, legenda).catch(() => false);
                if (!ok) setMsg("Compartilhar direto funciona no celular. No computador, baixe a imagem e envie.");
              }}
              className="w-full rounded-full border border-borda py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              ↗ Compartilhar (WhatsApp / Instagram)
            </button>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(legenda);
                setMsg("Legenda copiada!");
              }}
              className="w-full text-xs text-cinza underline"
            >
              Copiar legenda com o link do app
            </button>
          </div>
          <p className="text-[11px] text-cinza">
            A arte usa a cor de destaque e o logo definidos em Minha empresa / Editar torneio. Link do app: {URL_PWA.replace(/^https?:\/\//, "")}
          </p>
        </div>

        <div className="flex justify-center">
          {gerando && !previa && <p className="text-sm text-cinza">Gerando...</p>}
          {previa && (
            <img
              src={previa}
              alt="Prévia da arte"
              className={`rounded-2xl border border-borda shadow-2xl w-full ${formato === "story" ? "max-w-[380px]" : "max-w-[520px]"}`}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
