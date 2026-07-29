import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components/Layout";
import { PageHeader } from "../../../components/PageHeader";
import { supabase } from "../../../lib/supabaseClient";
import { PERMISSOES_PADRAO, type Esporte, type FormatoEvento, type SorteioTipo } from "@padua-sports/shared";

interface FormularioEvento {
  nome: string;
  cidade: string;
  locais: string;
  esporte_id: string;
  qtd_equipes: string;
  qtd_atletas_por_equipe: string;
  formato: FormatoEvento;
  sorteio_tipo: SorteioTipo;
  data_inicio: string;
  data_fim: string;
}

const vazio: FormularioEvento = {
  nome: "",
  cidade: "",
  locais: "",
  esporte_id: "",
  qtd_equipes: "",
  qtd_atletas_por_equipe: "",
  formato: "grupos_mata_mata",
  sorteio_tipo: "automatico",
  data_inicio: "",
  data_fim: "",
};

export function CriarEvento() {
  const navigate = useNavigate();
  const [esportes, setEsportes] = useState<Esporte[]>([]);
  const [form, setForm] = useState<FormularioEvento>(vazio);
  const [logo, setLogo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("esportes")
      .select("*")
      .order("nome")
      .then(({ data }) => setEsportes((data as Esporte[]) ?? []));
  }, []);

  function atualizar<K extends keyof FormularioEvento>(campo: K, valor: FormularioEvento[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);

    try {
      const { data: usuario } = await supabase.auth.getUser();
      const gestorId = usuario.user?.id;
      if (!gestorId) throw new Error("Voce precisa estar logado para criar um evento.");

      let logo_url: string | null = null;
      if (logo) {
        const caminho = `${gestorId}/${Date.now()}-${logo.name}`;
        const { error: erroUpload } = await supabase.storage
          .from("logos-eventos")
          .upload(caminho, logo);
        if (erroUpload) throw erroUpload;
        logo_url = supabase.storage.from("logos-eventos").getPublicUrl(caminho).data.publicUrl;
      }

      const codigo_evento = crypto.randomUUID().slice(0, 8).toUpperCase();

      const { data: novoEvento, error: erroInsert } = await supabase
        .from("eventos")
        .insert({
          nome: form.nome,
          cidade: form.cidade,
          locais: form.locais.split(",").map((l) => l.trim()).filter(Boolean),
          esporte_id: form.esporte_id,
          logo_url,
          formato: form.formato,
          qtd_equipes: Number(form.qtd_equipes),
          qtd_atletas_por_equipe: Number(form.qtd_atletas_por_equipe),
          data_inicio: form.data_inicio,
          data_fim: form.data_fim || null,
          sorteio_tipo: form.sorteio_tipo,
          status: "inscricoes_abertas",
          gestor_id: gestorId,
          codigo_evento,
          permissoes: PERMISSOES_PADRAO,
        })
        .select()
        .single();

      if (erroInsert) throw erroInsert;

      navigate(`/eventos/${novoEvento.id}/editar`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar evento.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Layout>
      <PageHeader title="Criar Evento" subtitle="Configure um novo campeonato" />

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 max-w-2xl space-y-5">
        <Campo label="Nome do evento">
          <input
            required
            value={form.nome}
            onChange={(e) => atualizar("nome", e.target.value)}
            className="input"
          />
        </Campo>

        <Campo label="Cidade">
          <input
            required
            value={form.cidade}
            onChange={(e) => atualizar("cidade", e.target.value)}
            className="input"
          />
        </Campo>

        <Campo label="Local(is) - separados por virgula">
          <input
            value={form.locais}
            onChange={(e) => atualizar("locais", e.target.value)}
            placeholder="Ginasio Poliesportivo, Quadra Municipal"
            className="input"
          />
        </Campo>

        <Campo label="Esporte">
          <select
            required
            value={form.esporte_id}
            onChange={(e) => atualizar("esporte_id", e.target.value)}
            className="input"
          >
            <option value="">Selecione...</option>
            {esportes.map((esporte) => (
              <option key={esporte.id} value={esporte.id}>
                {esporte.nome}
              </option>
            ))}
          </select>
          <a href="/eventos/configuracoes" className="text-xs text-ps-azul-marinho underline mt-1 inline-block">
            + Adicionar novo esporte
          </a>
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Quantidade de equipes">
            <input
              type="number"
              min={2}
              required
              value={form.qtd_equipes}
              onChange={(e) => atualizar("qtd_equipes", e.target.value)}
              className="input"
            />
          </Campo>
          <Campo label="Atletas por equipe">
            <input
              type="number"
              min={1}
              required
              value={form.qtd_atletas_por_equipe}
              onChange={(e) => atualizar("qtd_atletas_por_equipe", e.target.value)}
              className="input"
            />
          </Campo>
        </div>

        <Campo label="Logo do campeonato">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </Campo>

        <Campo label="Formato">
          <select
            value={form.formato}
            onChange={(e) => atualizar("formato", e.target.value as FormatoEvento)}
            className="input"
          >
            <option value="mata_mata">Mata-mata</option>
            <option value="grupos_mata_mata">Fase de grupos + mata-mata</option>
            <option value="pontos_corridos">Pontos corridos</option>
          </select>
        </Campo>

        <Campo label="Sorteio">
          <select
            value={form.sorteio_tipo}
            onChange={(e) => atualizar("sorteio_tipo", e.target.value as SorteioTipo)}
            className="input"
          >
            <option value="automatico">Automatico (sistema sorteia)</option>
            <option value="manual">Manual (gestor posiciona)</option>
          </select>
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Data de inicio">
            <input
              type="date"
              required
              value={form.data_inicio}
              onChange={(e) => atualizar("data_inicio", e.target.value)}
              className="input"
            />
          </Campo>
          <Campo label="Data de encerramento">
            <input
              type="date"
              value={form.data_fim}
              onChange={(e) => atualizar("data_fim", e.target.value)}
              className="input"
            />
          </Campo>
        </div>

        <p className="text-xs text-slate-500">
          A configuracao de permissoes do evento usa a matriz padrao e pode ser ajustada depois em
          Configuracoes.
        </p>

        {erro && <p className="text-sm text-ps-vermelho">{erro}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="rounded-lg bg-ps-dourado text-ps-azul-escuro font-semibold px-5 py-2.5 text-sm hover:brightness-95 disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Criar evento"}
        </button>
      </form>
    </Layout>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
