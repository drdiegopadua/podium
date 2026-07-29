import type { TipoPerfil } from "../types";

export interface PermissoesPerfil {
  ver_classificacao?: boolean;
  ver_agenda?: boolean;
  ver_sumula?: boolean;
  ver_sumula_propria?: boolean;
  editar_perfil?: boolean;
  gerar_codigo_atleta?: boolean;
  aprovar_atleta?: boolean;
  editar_equipe?: boolean;
  designar_arbitro?: boolean;
  editar_evento?: boolean;
  realizar_sorteio?: boolean;
}

export type PermissoesEvento = Partial<Record<TipoPerfil, PermissoesPerfil>>;

export const PERMISSOES_PADRAO: PermissoesEvento = {
  super_admin: {
    ver_classificacao: true,
    ver_agenda: true,
    ver_sumula: true,
    editar_evento: true,
    realizar_sorteio: true,
    designar_arbitro: true,
  },
  gestor_evento: {
    ver_classificacao: true,
    ver_agenda: true,
    ver_sumula: true,
    editar_evento: true,
    realizar_sorteio: true,
    designar_arbitro: true,
  },
  arbitro: {
    ver_agenda: true,
    ver_sumula: true,
  },
  capitao_equipe: {
    ver_classificacao: true,
    ver_agenda: true,
    gerar_codigo_atleta: true,
    aprovar_atleta: true,
    editar_equipe: true,
  },
  atleta: {
    ver_classificacao: true,
    ver_agenda: true,
    ver_sumula_propria: true,
    editar_perfil: true,
  },
  publico: {
    ver_classificacao: true,
    ver_agenda: true,
    ver_sumula: false,
  },
};

export function podeFazer(
  permissoes: PermissoesEvento | undefined,
  perfil: TipoPerfil,
  acao: keyof PermissoesPerfil
): boolean {
  const efetivas = permissoes ?? PERMISSOES_PADRAO;
  return Boolean(efetivas[perfil]?.[acao] ?? PERMISSOES_PADRAO[perfil]?.[acao]);
}
