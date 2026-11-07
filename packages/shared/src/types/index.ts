import type { PermissoesEvento } from "../permissions";
import type { SumulaSchema } from "../sumula-schemas";

export type TipoPerfil =
  | "super_admin"
  | "gestor_evento"
  | "arbitro"
  | "capitao_equipe"
  | "atleta"
  | "publico";

export interface Perfil {
  id: string;
  nome: string;
  telefone?: string | null;
  tipo: TipoPerfil;
  criado_em: string;
}

export type PlanoEmpresa = "teste" | "basico" | "pro" | "enterprise";
export type PapelEmpresa = "dono" | "admin" | "gestor" | "arbitro";

export interface Empresa {
  id: string;
  nome: string;
  slug: string;
  logo_url?: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  plano: PlanoEmpresa;
  limite_torneios?: number | null;
  ativo: boolean;
  criado_em: string;
}

export interface MembroEmpresa {
  empresa_id: string;
  perfil_id: string;
  papel: PapelEmpresa;
  criado_em: string;
}

export interface Esporte {
  id: string;
  nome: string;
  padrao: boolean;
  configuracao_sumula: SumulaSchema;
  empresa_id?: string | null;
  criado_por?: string | null;
  criado_em: string;
}

export type FormatoEvento =
  | "mata_mata"
  | "grupos_mata_mata"
  | "pontos_corridos"
  | "pontos_corridos_ida_volta"
  | "pontos_corridos_mata_mata";

export const FORMATOS_EVENTO: { valor: FormatoEvento; rotulo: string; descricao: string }[] = [
  { valor: "grupos_mata_mata", rotulo: "Grupos + mata-mata", descricao: "Fase de grupos e os melhores avançam para o mata-mata" },
  { valor: "mata_mata", rotulo: "Mata-mata", descricao: "Eliminação direta desde o primeiro jogo" },
  { valor: "pontos_corridos", rotulo: "Pontos corridos", descricao: "Todos contra todos em turno único" },
  { valor: "pontos_corridos_ida_volta", rotulo: "Pontos corridos (ida e volta)", descricao: "Todos contra todos em dois turnos" },
  { valor: "pontos_corridos_mata_mata", rotulo: "Pontos corridos + playoffs", descricao: "Liga e os melhores colocados disputam playoffs" },
];

export type CriterioDesempate =
  | "vitorias"
  | "saldo"
  | "pontos_pro"
  | "confronto_direto"
  | "menos_cartoes"
  | "sorteio";

export const CRITERIOS_DESEMPATE: { valor: CriterioDesempate; rotulo: string }[] = [
  { valor: "vitorias", rotulo: "Número de vitórias" },
  { valor: "saldo", rotulo: "Saldo (gols/pontos/sets)" },
  { valor: "pontos_pro", rotulo: "Gols/pontos marcados" },
  { valor: "confronto_direto", rotulo: "Confronto direto" },
  { valor: "menos_cartoes", rotulo: "Menos cartões/faltas" },
  { valor: "sorteio", rotulo: "Sorteio" },
];

export interface RegrasEvento {
  pontos_vitoria: number;
  pontos_empate: number;
  pontos_derrota: number;
  pontos_wo: number;
  permite_empate: boolean;
  qtd_grupos?: number | null;
  classificados_por_grupo?: number | null;
  classificados_playoff?: number | null;
  disputa_terceiro: boolean;
  criterios_desempate: CriterioDesempate[];
  observacoes?: string | null;
}

export const REGRAS_PADRAO: RegrasEvento = {
  pontos_vitoria: 3,
  pontos_empate: 1,
  pontos_derrota: 0,
  pontos_wo: 0,
  permite_empate: true,
  qtd_grupos: 2,
  classificados_por_grupo: 2,
  classificados_playoff: 4,
  disputa_terceiro: true,
  criterios_desempate: ["vitorias", "saldo", "pontos_pro", "confronto_direto"],
  observacoes: "",
};
export type SorteioTipo = "manual" | "automatico";
export type StatusEvento =
  | "rascunho"
  | "inscricoes_abertas"
  | "sorteio_realizado"
  | "em_andamento"
  | "encerrado";

export interface Evento {
  id: string;
  nome: string;
  cidade: string;
  locais: string[];
  esporte_id: string;
  logo_url?: string | null;
  formato: FormatoEvento;
  qtd_equipes: number;
  qtd_atletas_por_equipe: number;
  data_inicio: string;
  data_fim?: string | null;
  sorteio_tipo: SorteioTipo;
  status: StatusEvento;
  gestor_id: string;
  empresa_id?: string | null;
  descricao?: string | null;
  regras: Partial<RegrasEvento>;
  codigo_evento: string;
  permissoes: PermissoesEvento;
  criado_em: string;
}

export interface Equipe {
  id: string;
  evento_id: string;
  nome: string;
  codigo_exclusivo: string;
  capitao_id?: string | null;
  posicao_grupo?: string | null;
  logo_url?: string | null;
  criado_em: string;
}

export interface Atleta {
  id: string;
  perfil_id: string;
  equipe_id: string;
  numero_camisa?: number | null;
  posicao?: string | null;
  data_nascimento?: string | null;
  documento?: string | null;
  foto_url?: string | null;
  aprovado: boolean;
  criado_em: string;
}

export type StatusJogo = "agendado" | "em_andamento" | "encerrado" | "wo";

export interface Jogo {
  id: string;
  evento_id: string;
  fase?: string | null;
  equipe_a_id: string;
  equipe_b_id: string;
  local?: string | null;
  data_hora?: string | null;
  status: StatusJogo;
  arbitro_id?: string | null;
  placar_a?: number | null;
  placar_b?: number | null;
  criado_em: string;
}

export type StatusSumula = "aberta" | "em_andamento" | "fechada";

export interface Sumula {
  id: string;
  jogo_id: string;
  esporte_id: string;
  dados: Record<string, unknown>;
  status: StatusSumula;
  fechada_por?: string | null;
  fechada_em?: string | null;
  criado_em: string;
}

export interface EstatisticaAtleta {
  id: string;
  sumula_id: string;
  atleta_id: string;
  estatisticas: Record<string, number>;
}

export interface Classificacao {
  id: string;
  evento_id: string;
  equipe_id: string;
  grupo?: string | null;
  pontos: number;
  vitorias: number;
  derrotas: number;
  saldo: number;
  atualizado_em: string;
}

export * from "../permissions";
export * from "../sumula-schemas";
