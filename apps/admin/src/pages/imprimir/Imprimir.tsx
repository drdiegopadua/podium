import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  FORMATOS_EVENTO,
  REGRAS_PADRAO,
  classificacaoPorGrupo,
  type Evento,
  type Jogo,
  type Lance,
  type LinhaClassificacao,
} from "@arena/shared";
import { supabase } from "../../lib/supabaseClient";
import { useSessao } from "../../contexts/SessaoContext";

type Doc = "tabela" | "classificacao" | "sumula" | "elenco";
interface EquipeMini {
  id: string;
  nome: string;
  logo_url?: string | null;
  posicao_grupo?: string | null;
}
interface AtletaMini {
  id: string;
  nome: string | null;
  numero_camisa: number | null;
  equipe_id: string;
}

const DOCS: { id: Doc; rotulo: string }[] = [
  { id: "tabela", rotulo: "Tabela de jogos" },
  { id: "classificacao", rotulo: "Classificação e artilharia" },
  { id: "sumula", rotulo: "Súmula de jogo" },
  { id: "elenco", rotulo: "Elencos das equipes" },
];

const dataHora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

/** Relatorios em layout de papel: imprimir ou salvar como PDF pelo navegador. */
export function Imprimir() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { empresaAtual } = useSessao();
  const doc = (params.get("doc") as Doc) || "tabela";
  const jogoParam = params.get("jogo") ?? "";

  const [evento, setEvento] = useState<Evento | null>(null);
  const [equipes, setEquipes] = useState<EquipeMini[]>([]);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [linhas, setLinhas] = useState<LinhaClassificacao[]>([]);
  const [lances, setLances] = useState<Lance[]>([]);
  const [atletas, setAtletas] = useState<AtletaMini[]>([]);
  const [esporte, setEsporte] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: ev }, { data: eq }, { data: j }, { data: c }, { data: l }] = await Promise.all([
        supabase.from("eventos").select("*, esporte:esportes(nome)").eq("id", id).single(),
        supabase.from("equipes").select("id, nome, logo_url, posicao_grupo").eq("evento_id", id).order("nome"),
        supabase.from("jogos").select("*").eq("evento_id", id),
        supabase.from("classificacao").select("*, equipe:equipes(nome, logo_url)").eq("evento_id", id),
        supabase.from("lances").select("*").eq("evento_id", id).order("criado_em"),
      ]);
      setEvento(ev as Evento);
      setEsporte((ev as { esporte?: { nome: string } } | null)?.esporte?.nome ?? "");
      const listaEq = (eq as EquipeMini[]) ?? [];
      setEquipes(listaEq);
      setJogos(
        ((j as Jogo[]) ?? []).sort(
          (a, b) =>
            (a.etapa === "mata_mata" ? 1 : 0) - (b.etapa === "mata_mata" ? 1 : 0) ||
            (a.rodada ?? 0) - (b.rodada ?? 0) ||
            (a.data_hora ?? "9").localeCompare(b.data_hora ?? "9") ||
            (a.ordem ?? 0) - (b.ordem ?? 0)
        )
      );
      setLinhas((c as LinhaClassificacao[]) ?? []);
      setLances((l as Lance[]) ?? []);
      if (listaEq.length) {
        const { data: at } = await supabase
          .from("atletas")
          .select("id, nome, numero_camisa, equipe_id")
          .in("equipe_id", listaEq.map((x) => x.id));
        setAtletas(((at as AtletaMini[]) ?? []).sort((a, b) => (a.numero_camisa ?? 999) - (b.numero_camisa ?? 999) || (a.nome ?? "").localeCompare(b.nome ?? "")));
      }
    })();
  }, [id]);

  const nomeEq = useMemo(() => new Map(equipes.map((e) => [e.id, e.nome])), [equipes]);
  const regras = { ...REGRAS_PADRAO, ...(evento?.regras ?? {}) };
  const jogosProntos = jogos.filter((j) => j.equipe_a_id && j.equipe_b_id);
  const jogoSel = jogos.find((j) => j.id === jogoParam) ?? jogosProntos.find((j) => j.status !== "encerrado") ?? jogosProntos[0];

  function trocar(campos: Record<string, string>) {
    const p = new URLSearchParams(params);
    Object.entries(campos).forEach(([k, v]) => p.set(k, v));
    setParams(p, { replace: true });
  }

  if (!evento) return <div className="p-10 text-cinza">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#2a2a2e] py-6 print:bg-white print:py-0">
      {/* barra de ferramentas */}
      <div className="nao-imprimir max-w-[210mm] mx-auto mb-4 px-2 flex flex-wrap items-center gap-3">
        <Link to="/jogos-agenda" className="text-sm text-cinza underline">
          ← Voltar
        </Link>
        <select value={doc} onChange={(e) => trocar({ doc: e.target.value })} className="input max-w-xs">
          {DOCS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.rotulo}
            </option>
          ))}
        </select>
        {doc === "sumula" && (
          <select value={jogoSel?.id ?? ""} onChange={(e) => trocar({ jogo: e.target.value })} className="input max-w-sm">
            {jogosProntos.map((j) => (
              <option key={j.id} value={j.id}>
                {nomeEq.get(j.equipe_a_id!)} x {nomeEq.get(j.equipe_b_id!)} — {j.fase}
              </option>
            ))}
          </select>
        )}
        <button onClick={() => window.print()} className="ml-auto rounded-full bg-destaque text-preto font-semibold px-5 py-2 text-sm">
          🖨 Imprimir / Salvar PDF
        </button>
      </div>

      <main className="papel max-w-[210mm] mx-auto shadow-2xl px-[14mm] py-[12mm] text-[12px] leading-snug">
        <Cabecalho
          evento={evento}
          empresa={empresaAtual?.nome ?? ""}
          titulo={DOCS.find((d) => d.id === doc)?.rotulo ?? ""}
          sub={[esporte, FORMATOS_EVENTO.find((f) => f.valor === evento.formato)?.rotulo, evento.cidade].filter(Boolean).join(" · ")}
        />

        {doc === "tabela" && <DocTabela jogos={jogos} nomeEq={nomeEq} />}
        {doc === "classificacao" && (
          <DocClassificacao
            tabelas={classificacaoPorGrupo(linhas, regras.criterios_desempate, jogos)}
            lances={lances}
            nomeEq={nomeEq}
            semJogos={jogos.length === 0}
          />
        )}
        {doc === "sumula" &&
          (jogoSel ? (
            <DocSumula jogo={jogoSel} nomeEq={nomeEq} lances={lances.filter((l) => l.jogo_id === jogoSel.id)} atletas={atletas} />
          ) : (
            <p>Gere a tabela de jogos primeiro.</p>
          ))}
        {doc === "elenco" && <DocElenco equipes={equipes} atletas={atletas} porEquipe={evento.qtd_atletas_por_equipe} />}

        <footer className="mt-8 pt-3 border-t border-neutral-300 flex justify-between text-[10px] text-neutral-500">
          <span>Gerado por Arena Sports em {new Date().toLocaleString("pt-BR")}</span>
          <span>Código do torneio: {evento.codigo_evento}</span>
        </footer>
      </main>
    </div>
  );
}

function Cabecalho({ evento, empresa, titulo, sub }: { evento: Evento; empresa: string; titulo: string; sub: string }) {
  return (
    <header className="flex items-center gap-4 pb-4 mb-5 border-b-2 border-neutral-900">
      {evento.logo_url && <img src={evento.logo_url} alt="" className="w-16 h-16 object-contain" />}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-neutral-500">{empresa}</div>
        <h1 className="text-xl font-extrabold uppercase leading-tight">{evento.nome}</h1>
        <div className="text-[11px] text-neutral-600">{sub}</div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-widest text-neutral-500">Documento</div>
        <div className="font-bold">{titulo}</div>
      </div>
    </header>
  );
}

function DocTabela({ jogos, nomeEq }: { jogos: Jogo[]; nomeEq: Map<string, string> }) {
  if (jogos.length === 0) return <p>A tabela de jogos ainda não foi gerada.</p>;
  const blocos = new Map<string, Jogo[]>();
  for (const j of jogos) {
    const t = j.etapa === "mata_mata" ? j.fase ?? "Mata-mata" : j.rodada ? `Rodada ${j.rodada}` : "Jogos";
    blocos.set(t, [...(blocos.get(t) ?? []), j]);
  }
  return (
    <div className="space-y-5">
      {[...blocos.entries()].map(([titulo, js]) => (
        <section key={titulo} className="sem-quebra">
          <h2 className="font-bold uppercase text-[11px] tracking-wide mb-1.5">{titulo}</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[10px] text-neutral-500 text-left border-b border-neutral-300">
                <th className="py-1 w-[18%]">Data / hora</th>
                <th className="w-[16%]">Local</th>
                <th className="text-right w-[25%]">Mandante</th>
                <th className="text-center w-[10%]">Placar</th>
                <th className="w-[25%]">Visitante</th>
                <th className="w-[6%]">Gr.</th>
              </tr>
            </thead>
            <tbody>
              {js.map((j) => {
                const feito = j.status === "encerrado" || j.status === "wo";
                return (
                  <tr key={j.id} className="border-b border-neutral-200">
                    <td className="py-1.5">{dataHora(j.data_hora)}</td>
                    <td className="truncate">{j.local ?? "—"}</td>
                    <td className="text-right font-semibold">{j.equipe_a_id ? nomeEq.get(j.equipe_a_id) : "A definir"}</td>
                    <td className="text-center font-bold">
                      {feito ? `${j.placar_a ?? 0} x ${j.placar_b ?? 0}` : "___ x ___"}
                      {j.penaltis_a != null && j.penaltis_b != null && (
                        <div className="text-[9px] font-normal">pên. {j.penaltis_a}-{j.penaltis_b}</div>
                      )}
                    </td>
                    <td className="font-semibold">{j.equipe_b_id ? nomeEq.get(j.equipe_b_id) : "A definir"}</td>
                    <td>{j.grupo ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

function DocClassificacao({
  tabelas,
  lances,
  nomeEq,
  semJogos,
}: {
  tabelas: { grupo: string; linhas: LinhaClassificacao[] }[];
  lances: Lance[];
  nomeEq: Map<string, string>;
  semJogos: boolean;
}) {
  if (semJogos) return <p>Ainda não há jogos.</p>;
  const ranking = (tipo: Lance["tipo"]) => {
    const m = new Map<string, { nome: string; equipe: string; total: number }>();
    for (const l of lances) {
      if (l.tipo !== tipo || !l.jogador_nome) continue;
      const k = `${l.equipe_id}|${l.jogador_nome.toLowerCase()}`;
      const it = m.get(k) ?? { nome: l.jogador_nome, equipe: nomeEq.get(l.equipe_id ?? "") ?? "", total: 0 };
      it.total += l.quantidade;
      m.set(k, it);
    }
    return [...m.values()].sort((a, b) => b.total - a.total).slice(0, 15);
  };
  const gols = ranking("gol");
  return (
    <div className="space-y-6">
      {tabelas.map((t) => (
        <section key={t.grupo} className="sem-quebra">
          {t.grupo && <h2 className="font-bold uppercase text-[11px] tracking-wide mb-1.5">Grupo {t.grupo}</h2>}
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[10px] text-neutral-500 border-b border-neutral-400">
                <th className="text-left py-1">#</th>
                <th className="text-left">Equipe</th>
                {["P", "J", "V", "E", "D", "GP", "GC", "SG"].map((h) => (
                  <th key={h} className="text-center w-[7%]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.linhas.map((l, i) => (
                <tr key={l.id} className="border-b border-neutral-200">
                  <td className="py-1.5 w-6">{i + 1}</td>
                  <td className="font-semibold">{l.equipe?.nome}</td>
                  <td className="text-center font-bold">{l.pontos}</td>
                  <td className="text-center">{l.jogos ?? 0}</td>
                  <td className="text-center">{l.vitorias}</td>
                  <td className="text-center">{l.empates ?? 0}</td>
                  <td className="text-center">{l.derrotas}</td>
                  <td className="text-center">{l.gols_pro ?? 0}</td>
                  <td className="text-center">{l.gols_contra ?? 0}</td>
                  <td className="text-center">{l.saldo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      {gols.length > 0 && (
        <section className="sem-quebra">
          <h2 className="font-bold uppercase text-[11px] tracking-wide mb-1.5">Artilharia</h2>
          <table className="w-full border-collapse">
            <tbody>
              {gols.map((g, i) => (
                <tr key={`${g.nome}-${g.equipe}`} className="border-b border-neutral-200">
                  <td className="py-1 w-6">{i + 1}</td>
                  <td className="font-semibold">{g.nome}</td>
                  <td className="text-neutral-600">{g.equipe}</td>
                  <td className="text-right font-bold w-16">{g.total} gol{g.total > 1 ? "s" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function DocSumula({ jogo, nomeEq, lances, atletas }: { jogo: Jogo; nomeEq: Map<string, string>; lances: Lance[]; atletas: AtletaMini[] }) {
  const feito = jogo.status === "encerrado" || jogo.status === "wo";
  const lados = [jogo.equipe_a_id!, jogo.equipe_b_id!];
  const total = (eq: string, nome: string, tipo: Lance["tipo"]) =>
    lances
      .filter((l) => l.equipe_id === eq && l.tipo === tipo && (l.jogador_nome ?? "").toLowerCase() === nome.toLowerCase())
      .reduce((s, l) => s + l.quantidade, 0);
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center border border-neutral-400 rounded p-4">
        <div className="text-lg font-extrabold uppercase">{nomeEq.get(lados[0])}</div>
        <div className="text-3xl font-black">
          {feito ? `${jogo.placar_a ?? 0} x ${jogo.placar_b ?? 0}` : "___ x ___"}
          {jogo.penaltis_a != null && jogo.penaltis_b != null && <div className="text-xs font-normal">pênaltis {jogo.penaltis_a} x {jogo.penaltis_b}</div>}
        </div>
        <div className="text-lg font-extrabold uppercase">{nomeEq.get(lados[1])}</div>
      </section>
      <div className="grid grid-cols-3 gap-3 text-[11px]">
        <Campo rotulo="Fase / rodada" valor={jogo.fase ?? ""} />
        <Campo rotulo="Data e hora" valor={dataHora(jogo.data_hora)} />
        <Campo rotulo="Local" valor={jogo.local ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {lados.map((eq) => {
          const elenco = atletas.filter((a) => a.equipe_id === eq);
          const nomesLances = Array.from(
            new Set(lances.filter((l) => l.equipe_id === eq && l.jogador_nome).map((l) => l.jogador_nome!.trim()))
          ).filter((n) => !elenco.some((a) => (a.nome ?? "").toLowerCase() === n.toLowerCase()));
          const linhas = [...elenco.map((a) => ({ num: a.numero_camisa, nome: a.nome ?? "" })), ...nomesLances.map((n) => ({ num: null, nome: n }))];
          const vazias = Math.max(0, 14 - linhas.length);
          return (
            <section key={eq} className="sem-quebra">
              <h3 className="font-bold uppercase text-[11px] mb-1">{nomeEq.get(eq)}</h3>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-neutral-500 text-[9px] text-neutral-500">
                    <th className="text-left w-7 py-0.5">Nº</th>
                    <th className="text-left">Atleta</th>
                    <th className="w-8">Gols</th>
                    <th className="w-7">CA</th>
                    <th className="w-7">CV</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((a, i) => (
                    <tr key={i} className="border-b border-neutral-200 h-5">
                      <td>{a.num ?? ""}</td>
                      <td className="truncate">{a.nome}</td>
                      <td className="text-center">{total(eq, a.nome, "gol") || ""}</td>
                      <td className="text-center">{total(eq, a.nome, "amarelo") || ""}</td>
                      <td className="text-center">{total(eq, a.nome, "vermelho") || ""}</td>
                    </tr>
                  ))}
                  {Array.from({ length: vazias }).map((_, i) => (
                    <tr key={`v${i}`} className="border-b border-neutral-200 h-5">
                      <td colSpan={5} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>

      <section className="sem-quebra">
        <h3 className="font-bold uppercase text-[11px] mb-1">Observações do árbitro</h3>
        <div className="h-20 border border-neutral-400 rounded" />
      </section>
      <section className="grid grid-cols-3 gap-6 pt-8 text-center text-[10px]">
        {["Árbitro", `Capitão — ${nomeEq.get(lados[0])}`, `Capitão — ${nomeEq.get(lados[1])}`].map((r) => (
          <div key={r} className="border-t border-neutral-700 pt-1">
            {r}
          </div>
        ))}
      </section>
    </div>
  );
}

function DocElenco({ equipes, atletas, porEquipe }: { equipes: EquipeMini[]; atletas: AtletaMini[]; porEquipe: number }) {
  if (equipes.length === 0) return <p>Nenhuma equipe cadastrada.</p>;
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
      {equipes.map((e) => {
        const elenco = atletas.filter((a) => a.equipe_id === e.id);
        const vazias = Math.max(0, Math.min(porEquipe || 12, 25) - elenco.length);
        return (
          <section key={e.id} className="sem-quebra">
            <h3 className="font-bold uppercase text-[11px] mb-1 flex items-center gap-2">
              {e.logo_url && <img src={e.logo_url} alt="" className="w-5 h-5 object-contain" />}
              {e.nome}
              {e.posicao_grupo && <span className="text-neutral-500 font-normal">· Grupo {e.posicao_grupo}</span>}
            </h3>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-neutral-500 text-[9px] text-neutral-500">
                  <th className="text-left w-7 py-0.5">Nº</th>
                  <th className="text-left">Atleta</th>
                  <th className="text-left w-24">Documento</th>
                </tr>
              </thead>
              <tbody>
                {elenco.map((a) => (
                  <tr key={a.id} className="border-b border-neutral-200 h-5">
                    <td>{a.numero_camisa ?? ""}</td>
                    <td>{a.nome}</td>
                    <td />
                  </tr>
                ))}
                {Array.from({ length: vazias }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-200 h-5">
                    <td colSpan={3} />
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="border-b border-neutral-400 pb-0.5">
      <div className="text-[9px] uppercase text-neutral-500">{rotulo}</div>
      <div className="min-h-[16px]">{valor}</div>
    </div>
  );
}
