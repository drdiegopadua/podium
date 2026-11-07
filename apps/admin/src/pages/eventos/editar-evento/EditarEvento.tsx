import { URL_PWA } from "../../../lib/config";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { FORMATOS_EVENTO, type Evento, type StatusEvento } from "@arena/shared";
import { Layout } from "../../../components/Layout";
import { PageHeader } from "../../../components/PageHeader";
import { CampoImagem } from "../../../components/CampoImagem";
import { supabase } from "../../../lib/supabaseClient";
import { enviarImagem } from "../../../lib/upload";

const STATUS: { valor: StatusEvento; rotulo: string }[] = [
  { valor: "rascunho", rotulo: "Rascunho (não aparece no app)" },
  { valor: "inscricoes_abertas", rotulo: "Inscrições abertas" },
  { valor: "sorteio_realizado", rotulo: "Sorteio realizado" },
  { valor: "em_andamento", rotulo: "Em andamento" },
  { valor: "encerrado", rotulo: "Encerrado" },
];

export function EditarEvento() {
  const { id } = useParams();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    cidade: "",
    locais: "",
    data_inicio: "",
    data_fim: "",
    status: "inscricoes_abertas" as StatusEvento,
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [removerLogo, setRemoverLogo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [qtdEquipes, setQtdEquipes] = useState(0);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("eventos")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const e = data as Evento;
        setEvento(e);
        setForm({
          nome: e.nome,
          descricao: e.descricao ?? "",
          cidade: e.cidade,
          locais: (e.locais ?? []).join(", "),
          data_inicio: e.data_inicio,
          data_fim: e.data_fim ?? "",
          status: e.status,
        });
      });
    supabase
      .from("equipes")
      .select("id", { count: "exact", head: true })
      .eq("evento_id", id)
      .then(({ count }) => setQtdEquipes(count ?? 0));
  }, [id]);

  function atualizar<K extends keyof typeof form>(campo: K, valor: (typeof form)[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!evento) return;
    setSalvando(true);
    setMsg(null);
    try {
      let logo_url = removerLogo ? null : evento.logo_url ?? null;
      if (logo) logo_url = await enviarImagem(logo, `${evento.empresa_id ?? "sem-empresa"}/torneios`);
      const { data, error } = await supabase
        .from("eventos")
        .update({
          nome: form.nome,
          descricao: form.descricao || null,
          cidade: form.cidade,
          locais: form.locais.split(",").map((l) => l.trim()).filter(Boolean),
          data_inicio: form.data_inicio,
          data_fim: form.data_fim || null,
          status: form.status,
          logo_url,
        })
        .eq("id", evento.id)
        .select()
        .single();
      if (error) throw error;
      setEvento(data as Evento);
      setLogo(null);
      setRemoverLogo(false);
      setMsg({ ok: true, texto: "Torneio salvo." });
    } catch (err) {
      setMsg({ ok: false, texto: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setSalvando(false);
    }
  }

  if (!evento) {
    return (
      <Layout>
        <p className="text-sm text-cinza">Carregando...</p>
      </Layout>
    );
  }

  const linkApp = `${URL_PWA}/e/${evento.codigo_evento}`;

  return (
    <Layout>
      <PageHeader
        title={evento.nome}
        subtitle={FORMATOS_EVENTO.find((f) => f.valor === evento.formato)?.rotulo}
      />

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 max-w-5xl">
        <form onSubmit={salvar} className="bg-cartao rounded-2xl border border-borda p-6 space-y-4">
          <div>
            <span className="block text-sm font-medium text-white/80 mb-2">Logo do torneio</span>
            <CampoImagem
              urlAtual={removerLogo ? null : evento.logo_url}
              arquivo={logo}
              onChange={(f) => {
                setLogo(f);
                if (f) setRemoverLogo(false);
              }}
              onRemover={() => setRemoverLogo(true)}
              rotulo="Enviar logo"
            />
          </div>
          <Campo label="Nome do torneio">
            <input required value={form.nome} onChange={(e) => atualizar("nome", e.target.value)} className="input" />
          </Campo>
          <Campo label="Descrição">
            <textarea rows={2} value={form.descricao} onChange={(e) => atualizar("descricao", e.target.value)} className="input" />
          </Campo>
          <div className="grid sm:grid-cols-2 gap-4">
            <Campo label="Cidade">
              <input required value={form.cidade} onChange={(e) => atualizar("cidade", e.target.value)} className="input" />
            </Campo>
            <Campo label="Locais (vírgula)">
              <input value={form.locais} onChange={(e) => atualizar("locais", e.target.value)} className="input" />
            </Campo>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Campo label="Início">
              <input type="date" required value={form.data_inicio} onChange={(e) => atualizar("data_inicio", e.target.value)} className="input" />
            </Campo>
            <Campo label="Encerramento">
              <input type="date" value={form.data_fim} onChange={(e) => atualizar("data_fim", e.target.value)} className="input" />
            </Campo>
            <Campo label="Situação">
              <select value={form.status} onChange={(e) => atualizar("status", e.target.value as StatusEvento)} className="input">
                {STATUS.map((s) => (
                  <option key={s.valor} value={s.valor}>
                    {s.rotulo}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          {msg && <p className={`text-sm ${msg.ok ? "text-destaque" : "text-ps-vermelho"}`}>{msg.texto}</p>}
          <button
            disabled={salvando}
            className="rounded-full bg-destaque text-preto font-semibold px-6 py-2.5 text-sm disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>

        <aside className="space-y-4">
          <div className="bg-cartao rounded-2xl border border-borda p-5">
            <div className="text-xs text-cinza">Código do torneio</div>
            <div className="font-mono text-2xl font-bold tracking-widest text-destaque mt-1">{evento.codigo_evento}</div>
            <a href={linkApp} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-white/80 underline break-all">
              {linkApp}
            </a>
          </div>
          <div className="bg-cartao rounded-2xl border border-borda p-5 space-y-3">
            <div className="text-sm font-semibold">Próximos passos</div>
            <Passo to={`/equipes?evento=${evento.id}`} titulo="Cadastrar equipes e escudos" sub={`${qtdEquipes} de ${evento.qtd_equipes} cadastradas`} />
            <Passo to={`/eventos/${evento.id}/sorteio`} titulo="Fazer o sorteio" sub="Monta grupos e chaves" />
            <Passo to={`/jogos-agenda`} titulo="Agendar jogos" sub="Datas, locais e árbitros" />
          </div>
        </aside>
      </div>
    </Layout>
  );
}

function Passo({ to, titulo, sub }: { to: string; titulo: string; sub: string }) {
  return (
    <Link to={to} className="block rounded-xl bg-cartao-2 border border-borda px-4 py-3 hover:border-destaque">
      <div className="text-sm font-semibold">{titulo} →</div>
      <div className="text-xs text-cinza">{sub}</div>
    </Link>
  );
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-white/80 mb-1">{label}</span>
      {children}
    </label>
  );
}
