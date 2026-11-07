import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../../components/Layout";
import { PageHeader } from "../../../components/PageHeader";
import { CampoImagem } from "../../../components/CampoImagem";
import { supabase } from "../../../lib/supabaseClient";
import { enviarImagem } from "../../../lib/upload";
import { useSessao } from "../../../contexts/SessaoContext";
import {
  CRITERIOS_DESEMPATE,
  FORMATOS_EVENTO,
  PERMISSOES_PADRAO,
  REGRAS_PADRAO,
  type CriterioDesempate,
  type Esporte,
  type FormatoEvento,
  type RegrasEvento,
  type SorteioTipo,
} from "@arena/shared";

interface FormularioEvento {
  nome: string;
  descricao: string;
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
  descricao: "",
  cidade: "",
  locais: "",
  esporte_id: "",
  qtd_equipes: "8",
  qtd_atletas_por_equipe: "12",
  formato: "grupos_mata_mata",
  sorteio_tipo: "automatico",
  data_inicio: "",
  data_fim: "",
};

const NOVO_ESPORTE = "__novo__";

export function CriarEvento() {
  const navigate = useNavigate();
  const { empresaAtual } = useSessao();
  const [esportes, setEsportes] = useState<Esporte[]>([]);
  const [form, setForm] = useState<FormularioEvento>(vazio);
  const [regras, setRegras] = useState<RegrasEvento>(REGRAS_PADRAO);
  const [novoEsporte, setNovoEsporte] = useState({ nome: "", campos: "gols, assistências, cartões" });
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

  function atualizarRegra<K extends keyof RegrasEvento>(campo: K, valor: RegrasEvento[K]) {
    setRegras((atual) => ({ ...atual, [campo]: valor }));
  }

  function alternarCriterio(c: CriterioDesempate) {
    setRegras((atual) => ({
      ...atual,
      criterios_desempate: atual.criterios_desempate.includes(c)
        ? atual.criterios_desempate.filter((x) => x !== c)
        : [...atual.criterios_desempate, c],
    }));
  }

  const temGrupos = form.formato === "grupos_mata_mata";
  const temPlayoff = form.formato === "pontos_corridos_mata_mata";
  const temMataMata = form.formato !== "pontos_corridos" && form.formato !== "pontos_corridos_ida_volta";

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    if (!empresaAtual) return;
    setErro(null);
    setSalvando(true);

    try {
      const { data: usuario } = await supabase.auth.getUser();
      const gestorId = usuario.user?.id;
      if (!gestorId) throw new Error("Você precisa estar logado para criar um torneio.");

      let esporteId = form.esporte_id;
      if (esporteId === NOVO_ESPORTE) {
        const campos = novoEsporte.campos.split(",").map((c) => slug(c)).filter(Boolean);
        const { data: criado, error } = await supabase
          .from("esportes")
          .insert({
            nome: novoEsporte.nome,
            padrao: false,
            empresa_id: empresaAtual.id,
            criado_por: gestorId,
            configuracao_sumula: { campos_por_atleta: campos.length ? campos : ["pontos"] },
          })
          .select()
          .single();
        if (error) throw error;
        esporteId = criado.id;
      }

      const logo_url = logo ? await enviarImagem(logo, `${empresaAtual.id}/torneios`) : null;

      const codigo_evento = crypto.randomUUID().slice(0, 8).toUpperCase();

      const { data: novoEvento, error: erroInsert } = await supabase
        .from("eventos")
        .insert({
          empresa_id: empresaAtual.id,
          nome: form.nome,
          descricao: form.descricao || null,
          cidade: form.cidade,
          locais: form.locais.split(",").map((l) => l.trim()).filter(Boolean),
          esporte_id: esporteId,
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
          regras: {
            ...regras,
            pontos_empate: regras.permite_empate ? regras.pontos_empate : 0,
            qtd_grupos: temGrupos ? regras.qtd_grupos : null,
            classificados_por_grupo: temGrupos ? regras.classificados_por_grupo : null,
            classificados_playoff: temPlayoff ? regras.classificados_playoff : null,
            disputa_terceiro: temMataMata ? regras.disputa_terceiro : false,
          },
        })
        .select()
        .single();

      if (erroInsert) throw erroInsert;

      navigate(`/eventos/${novoEvento.id}/editar`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar torneio.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Layout>
      <PageHeader title="Criar Torneio" subtitle="Escolha o esporte, o formato e as regras do campeonato" />

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <Secao numero={1} titulo="Informações">
          <Campo label="Nome do torneio">
            <input required value={form.nome} onChange={(e) => atualizar("nome", e.target.value)} className="input" />
          </Campo>
          <Campo label="Descrição (aparece no app)">
            <textarea
              rows={2}
              value={form.descricao}
              onChange={(e) => atualizar("descricao", e.target.value)}
              className="input"
            />
          </Campo>
          <div className="grid sm:grid-cols-2 gap-4">
            <Campo label="Cidade">
              <input required value={form.cidade} onChange={(e) => atualizar("cidade", e.target.value)} className="input" />
            </Campo>
            <Campo label="Local(is) — separados por vírgula">
              <input
                value={form.locais}
                onChange={(e) => atualizar("locais", e.target.value)}
                placeholder="Ginásio Municipal, Quadra 2"
                className="input"
              />
            </Campo>
          </div>
          <div>
            <span className="block text-sm font-medium text-white/80 mb-2">Logo do torneio</span>
            <CampoImagem arquivo={logo} onChange={setLogo} rotulo="Enviar logo" />
          </div>
        </Secao>

        <Secao numero={2} titulo="Esporte">
          <Campo label="Modalidade">
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
                  {esporte.empresa_id ? " (personalizado)" : ""}
                </option>
              ))}
              <option value={NOVO_ESPORTE}>+ Outro esporte...</option>
            </select>
          </Campo>
          {form.esporte_id === NOVO_ESPORTE && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Campo label="Nome do esporte">
                <input
                  required
                  value={novoEsporte.nome}
                  onChange={(e) => setNovoEsporte((n) => ({ ...n, nome: e.target.value }))}
                  placeholder="Ex.: Beach Tennis"
                  className="input"
                />
              </Campo>
              <Campo label="Estatísticas por atleta (vírgula)">
                <input
                  value={novoEsporte.campos}
                  onChange={(e) => setNovoEsporte((n) => ({ ...n, campos: e.target.value }))}
                  className="input"
                />
              </Campo>
            </div>
          )}
        </Secao>

        <Secao numero={3} titulo="Formato e equipes">
          <div className="grid sm:grid-cols-2 gap-3">
            {FORMATOS_EVENTO.map((f) => (
              <label
                key={f.valor}
                className={`cursor-pointer rounded-lg border p-3 text-sm ${
                  form.formato === f.valor ? "border-destaque bg-destaque/10" : "border-borda"
                }`}
              >
                <input
                  type="radio"
                  name="formato"
                  className="sr-only"
                  checked={form.formato === f.valor}
                  onChange={() => atualizar("formato", f.valor)}
                />
                <div className="font-semibold text-white">{f.rotulo}</div>
                <div className="text-xs text-cinza mt-0.5">{f.descricao}</div>
              </label>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Campo label="Quantidade de equipes">
              <input
                type="number"
                min={2}
                max={256}
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
            <Campo label="Sorteio">
              <select
                value={form.sorteio_tipo}
                onChange={(e) => atualizar("sorteio_tipo", e.target.value as SorteioTipo)}
                className="input"
              >
                <option value="automatico">Automático</option>
                <option value="manual">Manual</option>
              </select>
            </Campo>
          </div>

          {temGrupos && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Campo label="Número de grupos">
                <NumeroInput valor={regras.qtd_grupos ?? 0} min={1} onChange={(v) => atualizarRegra("qtd_grupos", v)} />
              </Campo>
              <Campo label="Classificados por grupo">
                <NumeroInput
                  valor={regras.classificados_por_grupo ?? 0}
                  min={1}
                  onChange={(v) => atualizarRegra("classificados_por_grupo", v)}
                />
              </Campo>
            </div>
          )}
          {temPlayoff && (
            <Campo label="Classificados para os playoffs">
              <NumeroInput
                valor={regras.classificados_playoff ?? 0}
                min={2}
                onChange={(v) => atualizarRegra("classificados_playoff", v)}
              />
            </Campo>
          )}
          {temMataMata && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={regras.disputa_terceiro}
                onChange={(e) => atualizarRegra("disputa_terceiro", e.target.checked)}
              />
              Ter disputa de 3º lugar
            </label>
          )}
        </Secao>

        <Secao numero={4} titulo="Regras de pontuação">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={regras.permite_empate}
              onChange={(e) => atualizarRegra("permite_empate", e.target.checked)}
            />
            Permitir empate
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Campo label="Vitória">
              <NumeroInput valor={regras.pontos_vitoria} onChange={(v) => atualizarRegra("pontos_vitoria", v)} />
            </Campo>
            {regras.permite_empate && (
              <Campo label="Empate">
                <NumeroInput valor={regras.pontos_empate} onChange={(v) => atualizarRegra("pontos_empate", v)} />
              </Campo>
            )}
            <Campo label="Derrota">
              <NumeroInput valor={regras.pontos_derrota} onChange={(v) => atualizarRegra("pontos_derrota", v)} />
            </Campo>
            <Campo label="Perder por W.O.">
              <NumeroInput valor={regras.pontos_wo} min={-10} onChange={(v) => atualizarRegra("pontos_wo", v)} />
            </Campo>
          </div>

          <div>
            <span className="block text-sm font-medium text-white/80 mb-2">
              Critérios de desempate (na ordem em que forem marcados)
            </span>
            <div className="flex flex-wrap gap-2">
              {CRITERIOS_DESEMPATE.map((c) => {
                const posicao = regras.criterios_desempate.indexOf(c.valor);
                const ativo = posicao >= 0;
                return (
                  <button
                    type="button"
                    key={c.valor}
                    onClick={() => alternarCriterio(c.valor)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      ativo ? "border-destaque bg-destaque/10 text-white font-semibold" : "border-borda text-cinza"
                    }`}
                  >
                    {ativo && `${posicao + 1}º `}
                    {c.rotulo}
                  </button>
                );
              })}
            </div>
          </div>

          <Campo label="Regulamento / observações">
            <textarea
              rows={3}
              value={regras.observacoes ?? ""}
              onChange={(e) => atualizarRegra("observacoes", e.target.value)}
              placeholder="Ex.: tolerância de 15 min para W.O., uniforme obrigatório..."
              className="input"
            />
          </Campo>
        </Secao>

        <Secao numero={5} titulo="Datas">
          <div className="grid sm:grid-cols-2 gap-4">
            <Campo label="Início">
              <input
                type="date"
                required
                value={form.data_inicio}
                onChange={(e) => atualizar("data_inicio", e.target.value)}
                className="input"
              />
            </Campo>
            <Campo label="Encerramento">
              <input
                type="date"
                min={form.data_inicio || undefined}
                value={form.data_fim}
                onChange={(e) => atualizar("data_fim", e.target.value)}
                className="input"
              />
            </Campo>
          </div>
        </Secao>

        {erro && <p className="text-sm text-ps-vermelho">{erro}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="rounded-full bg-destaque text-preto font-semibold px-6 py-2.5 text-sm hover:brightness-95 disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Criar torneio"}
        </button>
      </form>
    </Layout>
  );
}

function Secao({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <section className="bg-cartao rounded-2xl shadow-sm border border-borda p-6 space-y-4">
      <h2 className="font-bold text-white flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-destaque text-preto text-xs flex items-center justify-center">
          {numero}
        </span>
        {titulo}
      </h2>
      {children}
    </section>
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

function NumeroInput({ valor, onChange, min = 0 }: { valor: number; onChange: (v: number) => void; min?: number }) {
  return (
    <input
      type="number"
      min={min}
      value={valor}
      onChange={(e) => onChange(Number(e.target.value))}
      className="input"
    />
  );
}

function slug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
