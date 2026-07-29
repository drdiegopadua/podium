export interface SumulaSchema {
  campos_por_atleta: string[];
  eventos_jogo?: string[];
  [chave: string]: unknown;
}

export interface SumulaSchemaVolei extends SumulaSchema {
  sets: { quantidade_max: number; pontos_por_set: number; tie_break: number };
  campos_por_atleta: ["pontos", "aces", "bloqueios", "erros_saque"];
  eventos_jogo: ["substituicao", "tempo_tecnico", "cartao"];
  ordem_saque: boolean;
}

export interface SumulaSchemaBasquete extends SumulaSchema {
  periodos: number;
  duracao_periodo_min: number;
  campos_por_atleta: ["pontos", "rebotes", "assistencias", "faltas"];
  faltas_max_atleta: number;
}

export const SUMULA_SCHEMA_VOLEI: SumulaSchemaVolei = {
  sets: { quantidade_max: 5, pontos_por_set: 25, tie_break: 15 },
  campos_por_atleta: ["pontos", "aces", "bloqueios", "erros_saque"],
  eventos_jogo: ["substituicao", "tempo_tecnico", "cartao"],
  ordem_saque: true,
};

export const SUMULA_SCHEMA_BASQUETE: SumulaSchemaBasquete = {
  periodos: 4,
  duracao_periodo_min: 10,
  campos_por_atleta: ["pontos", "rebotes", "assistencias", "faltas"],
  faltas_max_atleta: 5,
};

export const SUMULA_SCHEMAS_PADRAO: Record<string, SumulaSchema> = {
  volei: SUMULA_SCHEMA_VOLEI,
  basquete: SUMULA_SCHEMA_BASQUETE,
};
