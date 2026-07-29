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

export interface Esporte {
  id: string;
  nome: string;
  padrao: boolean;
  configuracao_sumula: SumulaSchema;
  criado_por?: string | null;
  criado_em: string;
}

export type FormatoEvento = "mata_mata" | "grupos_mata_mata" | "pontos_corridos";
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
