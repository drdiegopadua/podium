import { useEffect, useMemo, useState } from "react";
import type { Evento, Jogo, StatusJogo, TipoLance } from "@arena/shared";
import { supabase } from "../../lib/supabaseClient";

export interface EquipeMini {
  id: string;
  nome: string;
  logo_url?: string | null;
  posicao_grupo?: string | null;
}
export interface PessoaMini {
  id: string;
  nome: string;
}

interface AtletaMini {
  id: string;
  nome: string | null;
  numero_camisa: number | null;
  equipe_id: string;
}

interface LanceEdit {
  chave: string;
  equipe_id: string;
  tipo: TipoLance;
  jogador_nome: string;
  quantidade: number;
}

const TIPOS: { tipo: TipoLance; rotulo: string; icone: string }[] = [
  { tipo: "gol", rotulo: "Gol", icone: "⚽" },
  { tipo: "amarelo", rotulo: "Amarelo", icone: "🟨" },
  { tipo: "vermelho", rotulo: "Vermelho", icone: "🟥" },
  { tipo: "assistencia", rotulo: "Assist.", icone: "👟" },
  { tipo: "gol_contra", rotulo: "Contra", icone: "🥅" },
];
const ICONE = Object.fromEntries(TIPOS.map((t) => [t.tipo, t.icone])) as Record<TipoLance, string>;

const STATUS: { valor: StatusJogo; rotulo: string }[] = [
  { valor: "agendado", rotulo: "Agendado" },
  { valor: "em_andamento", rotulo: "Ao vivo" },
  { valor: "encerrado", rotulo: "Encerrado" },
  { valor: "wo", rotulo: "W.O." },
];

const chave = () => crypto.randomUUID();
const paraInputLocal = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function ModalResultado({
  jogo,
  evento,
  equipes,
  arbitros,
  onFechar,
  onSalvo,
}: {
  jogo: Jogo;
  evento: Evento;
  equipes: Map<string, EquipeMini>;
  arbitros: PessoaMini[];
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const a = equipes.get(jogo.equipe_a_id ?? "")!;
  const b = equipes.get(jogo.equipe_b_id ?? "")!;

  const [status, setStatus] = useState<StatusJogo>(jogo.status);
  const [placarA, setPlacarA] = useState<number>(jogo.placar_a ?? 0);
  const [placarB, setPlacarB] = useState<number>(jogo.placar_b ?? 0);
  const [penA, setPenA] = useState<string>(jogo.penaltis_a?.toString() ?? "");
  const [penB, setPenB] = useState<string>(jogo.penaltis_b?.toString() ?? "");
  const [woEquipe, setWoEquipe] = useState<string>(jogo.wo_equipe_id ?? "");
  const [dataHora, setDataHora] = useState(paraInputLocal(jogo.data_hora));
  const [local, setLocal] = useState(jogo.local ?? "");
  const [arbitro, setArbitro] = useState(jogo.arbitro_id ?? "");
  const [lances, setLances] = useState<LanceEdit[]>([]);
  const [atletas, setAtletas] = useState<AtletaMini[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("lances")
      .select("*")
      .eq("jogo_id", jogo.id)
      .order("criado_em")
      .then(({ data }) =>
        setLances(
          (data ?? []).map((l) => ({
            chave: l.id,
            equipe_id: l.equipe_id,
            tipo: l.tipo,
            jogador_nome: l.jogador_nome ?? "",
            quantidade: l.quantidade ?? 1,
          }))
        )
      );
    supabase
      .from("atletas")
      .select("id, nome, numero_camisa, equipe_id")
      .in("equipe_id", [a.id, b.id])
      .then(({ data }) => setAtletas((data as AtletaMini[]) ?? []));
  }, [jogo.id, a.id, b.id]);

  // Esc fecha
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onFechar]);

  const golsLancados = useMemo(() => {
    const soma = (eq: string, outra: string) =>
      lances
        .filter((l) => (l.tipo === "gol" && l.equipe_id === eq) || (l.tipo === "gol_contra" && l.equipe_id === outra))
        .reduce((s, l) => s + l.quantidade, 0);
    return { a: soma(a.id, b.id), b: soma(b.id, a.id) };
  }, [lances, a.id, b.id]);
  const temGols = lances.some((l) => l.tipo === "gol" || l.tipo === "gol_contra");
  const divergente = temGols && (golsLancados.a !== placarA || golsLancados.b !== placarB);

  const mataMata = jogo.etapa === "mata_mata";
  const empatado = placarA === placarB;
  const precisaPenaltis = mataMata && status === "encerrado" && empatado;

  function adicionar(equipe_id: string, tipo: TipoLance) {
    setLances((l) => [...l, { chave: chave(), equipe_id, tipo, jogador_nome: "", quantidade: 1 }]);
    if (tipo === "gol") {
      if (equipe_id === a.id) setPlacarA((p) => p + 1);
      else setPlacarB((p) => p + 1);
    }
    if (tipo === "gol_contra") {
      if (equipe_id === a.id) setPlacarB((p) => p + 1);
      else setPlacarA((p) => p + 1);
    }
  }

  function remover(k: string) {
    const l = lances.find((x) => x.chave === k);
    setLances((ls) => ls.filter((x) => x.chave !== k));
    if (!l) return;
    if (l.tipo === "gol") {
      if (l.equipe_id === a.id) setPlacarA((p) => Math.max(0, p - l.quantidade));
      else setPlacarB((p) => Math.max(0, p - l.quantidade));
    }
    if (l.tipo === "gol_contra") {
      if (l.equipe_id === a.id) setPlacarB((p) => Math.max(0, p - l.quantidade));
      else setPlacarA((p) => Math.max(0, p - l.quantidade));
    }
  }

  function alterar(k: string, campos: Partial<LanceEdit>) {
    setLances((ls) => ls.map((x) => (x.chave === k ? { ...x, ...campos } : x)));
  }

  async function salvar() {
    setErro(null);
    if (status === "wo" && !woEquipe) return setErro("Escolha qual equipe não compareceu (W.O.).");
    if (precisaPenaltis && (penA === "" || penB === "" || penA === penB))
      return setErro("Jogo de mata-mata empatado: informe o placar dos pênaltis (sem empate).");
    if (lances.some((l) => !l.jogador_nome.trim() && l.tipo !== "gol_contra"))
      return setErro("Preencha o nome do jogador em todos os lances (ou remova os vazios).");

    setSalvando(true);
    try {
      // novos nomes viram atletas do elenco
      const conhecidos = new Set(atletas.map((x) => `${x.equipe_id}|${(x.nome ?? "").trim().toLowerCase()}`));
      const novos = Array.from(
        new Map(
          lances
            .filter((l) => l.jogador_nome.trim() && l.tipo !== "gol_contra")
            .filter((l) => !conhecidos.has(`${l.equipe_id}|${l.jogador_nome.trim().toLowerCase()}`))
            .map((l) => [`${l.equipe_id}|${l.jogador_nome.trim().toLowerCase()}`, l])
        ).values()
      ).map((l) => ({ equipe_id: l.equipe_id, nome: l.jogador_nome.trim(), aprovado: true }));
      let elenco = atletas;
      if (novos.length) {
        const { data } = await supabase.from("atletas").insert(novos).select("id, nome, numero_camisa, equipe_id");
        elenco = [...atletas, ...((data as AtletaMini[]) ?? [])];
      }
      const idAtleta = (eq: string, nome: string) =>
        elenco.find((x) => x.equipe_id === eq && (x.nome ?? "").trim().toLowerCase() === nome.trim().toLowerCase())?.id ??
        null;

      const { error: e1 } = await supabase.from("lances").delete().eq("jogo_id", jogo.id);
      if (e1) throw e1;
      if (lances.length) {
        const { error: e2 } = await supabase.from("lances").insert(
          lances.map((l) => ({
            jogo_id: jogo.id,
            evento_id: evento.id,
            equipe_id: l.equipe_id,
            atleta_id: l.tipo === "gol_contra" ? null : idAtleta(l.equipe_id, l.jogador_nome),
            jogador_nome: l.jogador_nome.trim() || null,
            tipo: l.tipo,
            quantidade: Math.max(1, l.quantidade),
          }))
        );
        if (e2) throw e2;
      }

      const temPlacar = status !== "agendado";
      const { error: e3 } = await supabase
        .from("jogos")
        .update({
          status,
          placar_a: temPlacar ? placarA : null,
          placar_b: temPlacar ? placarB : null,
          penaltis_a: precisaPenaltis ? Number(penA) : null,
          penaltis_b: precisaPenaltis ? Number(penB) : null,
          wo_equipe_id: status === "wo" ? woEquipe : null,
          data_hora: dataHora ? new Date(dataHora).toISOString() : null,
          local: local || null,
          arbitro_id: arbitro || null,
        })
        .eq("id", jogo.id);
      if (e3) throw e3;
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar o resultado.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto p-4" onClick={onFechar}>
      <div
        className="w-full max-w-3xl bg-cartao border border-borda rounded-3xl p-6 my-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between">
          <div className="text-xs text-cinza">{jogo.fase}</div>
          <button onClick={onFechar} className="text-cinza hover:text-white text-xl leading-none" aria-label="Fechar">
            ×
          </button>
        </div>

        {/* Placar */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <Escudo equipe={a} tamanho={56} />
            <span className="font-bold">{a.nome}</span>
          </div>
          <div className="flex items-center gap-2">
            <Contador valor={placarA} onChange={setPlacarA} desabilitado={status === "agendado"} />
            <span className="text-cinza text-2xl">×</span>
            <Contador valor={placarB} onChange={setPlacarB} desabilitado={status === "agendado"} />
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <Escudo equipe={b} tamanho={56} />
            <span className="font-bold">{b.nome}</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {STATUS.map((s) => (
            <button
              key={s.valor}
              type="button"
              onClick={() => setStatus(s.valor)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold border ${
                status === s.valor ? "bg-destaque text-preto border-destaque" : "border-borda text-cinza"
              }`}
            >
              {s.rotulo}
            </button>
          ))}
        </div>

        {status === "wo" && (
          <div className="text-sm text-center space-x-4">
            <span className="text-cinza">Quem não compareceu?</span>
            {[a, b].map((eq) => (
              <label key={eq.id} className="inline-flex items-center gap-1.5">
                <input type="radio" checked={woEquipe === eq.id} onChange={() => setWoEquipe(eq.id)} />
                {eq.nome}
              </label>
            ))}
          </div>
        )}

        {precisaPenaltis && (
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="text-cinza">Pênaltis:</span>
            <input value={penA} onChange={(e) => setPenA(e.target.value.replace(/\D/g, ""))} className="input w-16 text-center" />
            <span className="text-cinza">×</span>
            <input value={penB} onChange={(e) => setPenB(e.target.value.replace(/\D/g, ""))} className="input w-16 text-center" />
          </div>
        )}

        {divergente && (
          <p className="text-xs text-center text-cinza">
            Gols lançados por jogador: {golsLancados.a} × {golsLancados.b}.{" "}
            <button
              type="button"
              className="text-destaque underline"
              onClick={() => {
                setPlacarA(golsLancados.a);
                setPlacarB(golsLancados.b);
              }}
            >
              Usar no placar
            </button>
          </p>
        )}

        {/* Lances */}
        {status !== "agendado" && (
          <div className="grid md:grid-cols-2 gap-4">
            {[a, b].map((eq) => (
              <ColunaLances
                key={eq.id}
                equipe={eq}
                lances={lances.filter((l) => l.equipe_id === eq.id)}
                elenco={atletas.filter((x) => x.equipe_id === eq.id)}
                onAdicionar={(t) => adicionar(eq.id, t)}
                onAlterar={alterar}
                onRemover={remover}
              />
            ))}
          </div>
        )}

        {/* Agenda */}
        <div className="grid sm:grid-cols-3 gap-3 border-t border-borda pt-5">
          <label className="block">
            <span className="block text-xs text-cinza mb-1">Data e hora</span>
            <input type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} className="input" />
          </label>
          <label className="block">
            <span className="block text-xs text-cinza mb-1">Local</span>
            <input value={local} onChange={(e) => setLocal(e.target.value)} list="locais-evento" className="input" />
            <datalist id="locais-evento">
              {(evento.locais ?? []).map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="block text-xs text-cinza mb-1">Árbitro / mesário</span>
            <select value={arbitro} onChange={(e) => setArbitro(e.target.value)} className="input">
              <option value="">Não definido</option>
              {arbitros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        {erro && <p className="text-sm text-ps-vermelho">{erro}</p>}

        <div className="flex justify-end gap-3">
          <button onClick={onFechar} className="rounded-full border border-borda px-5 py-2.5 text-sm">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="rounded-full bg-destaque text-preto font-semibold px-6 py-2.5 text-sm disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Salvar resultado"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Contador({ valor, onChange, desabilitado }: { valor: number; onChange: (v: number) => void; desabilitado: boolean }) {
  return (
    <div className={`flex flex-col items-center ${desabilitado ? "opacity-40 pointer-events-none" : ""}`}>
      <button type="button" onClick={() => onChange(valor + 1)} className="text-cinza hover:text-destaque text-lg leading-none px-3">
        ▲
      </button>
      <input
        value={valor}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
        className="w-16 text-center text-4xl font-extrabold bg-transparent tabular-nums focus:outline-none"
        inputMode="numeric"
      />
      <button
        type="button"
        onClick={() => onChange(Math.max(0, valor - 1))}
        className="text-cinza hover:text-destaque text-lg leading-none px-3"
      >
        ▼
      </button>
    </div>
  );
}

function ColunaLances({
  equipe,
  lances,
  elenco,
  onAdicionar,
  onAlterar,
  onRemover,
}: {
  equipe: EquipeMini;
  lances: LanceEdit[];
  elenco: AtletaMini[];
  onAdicionar: (t: TipoLance) => void;
  onAlterar: (k: string, c: Partial<LanceEdit>) => void;
  onRemover: (k: string) => void;
}) {
  const idLista = `elenco-${equipe.id}`;
  return (
    <div className="rounded-2xl bg-cartao-2 border border-borda p-4 space-y-3">
      <div className="text-sm font-semibold truncate">{equipe.nome}</div>
      <div className="flex flex-wrap gap-1.5">
        {TIPOS.map((t) => (
          <button
            key={t.tipo}
            type="button"
            onClick={() => onAdicionar(t.tipo)}
            className="rounded-full border border-borda px-2.5 py-1 text-xs hover:border-destaque"
          >
            + {t.icone} {t.rotulo}
          </button>
        ))}
      </div>
      <datalist id={idLista}>
        {elenco.map((x) => (
          <option key={x.id} value={x.nome ?? ""}>
            {x.numero_camisa ? `#${x.numero_camisa}` : ""}
          </option>
        ))}
      </datalist>
      {lances.length === 0 && <p className="text-xs text-cinza">Nenhum lance.</p>}
      {lances.map((l) => (
        <div key={l.chave} className="flex items-center gap-2">
          <span className="w-6 text-center" title={l.tipo}>
            {ICONE[l.tipo]}
          </span>
          <input
            value={l.jogador_nome}
            onChange={(e) => onAlterar(l.chave, { jogador_nome: e.target.value })}
            placeholder={l.tipo === "gol_contra" ? "Jogador (opcional)" : "Nome do jogador"}
            list={idLista}
            className="input py-1.5"
          />
          {(l.tipo === "gol" || l.tipo === "assistencia") && (
            <input
              value={l.quantidade}
              onChange={(e) => onAlterar(l.chave, { quantidade: Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1) })}
              title="Quantidade"
              className="input py-1.5 w-12 text-center"
            />
          )}
          <button type="button" onClick={() => onRemover(l.chave)} className="text-cinza hover:text-ps-vermelho px-1" aria-label="Remover">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function Escudo({ equipe, tamanho = 28 }: { equipe?: EquipeMini | null; tamanho?: number }) {
  const estilo = { width: tamanho, height: tamanho };
  if (equipe?.logo_url)
    return <img src={equipe.logo_url} alt="" style={estilo} className="shrink-0 rounded-full bg-cartao-2 object-contain p-0.5" />;
  return (
    <span
      style={{ ...estilo, fontSize: tamanho * 0.36 }}
      className="shrink-0 rounded-full bg-cartao-2 border border-borda text-cinza font-bold flex items-center justify-center"
    >
      {(equipe?.nome ?? "?")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("")}
    </span>
  );
}
