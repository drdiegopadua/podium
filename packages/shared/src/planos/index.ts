/**
 * Planos comerciais do Arena Sports.
 * Os LIMITES precisam bater com a funcao limites_plano() em supabase/migrations/0006_planos.sql.
 * Os PRECOS sao so exibicao (site e tela "Meu plano") — ajuste aqui quando quiser.
 */
import type { PlanoEmpresa } from "../types";

export interface InfoPlano {
  codigo: PlanoEmpresa;
  nome: string;
  precoMensal: number | null; // null = sob consulta
  precoAnualMes: number | null; // valor por mes no plano anual
  descricao: string;
  limites: { torneios: number | null; equipes: number | null; patrocinadores: number | null };
  recursos: string[];
  destaque?: boolean;
}

export const PLANOS: InfoPlano[] = [
  {
    codigo: "teste",
    nome: "Grátis",
    precoMensal: 0,
    precoAnualMes: 0,
    descricao: "Para experimentar e organizar um campeonato pequeno.",
    limites: { torneios: 1, equipes: 12, patrocinadores: 1 },
    recursos: [
      "1 campeonato ativo",
      "Até 12 equipes",
      "Tabela, classificação e artilharia automáticas",
      "App para torcedores",
      "Artes para redes sociais",
    ],
  },
  {
    codigo: "basico",
    nome: "Organizador",
    precoMensal: 39.9,
    precoAnualMes: 31.9,
    descricao: "Para quem organiza campeonatos o ano todo.",
    limites: { torneios: 5, equipes: 32, patrocinadores: 5 },
    recursos: [
      "5 campeonatos ativos ao mesmo tempo",
      "Até 32 equipes por campeonato",
      "Até 5 patrocinadores com banner",
      "Mural de notícias, fotos e vídeos",
      "Relatórios para imprimir (PDF)",
      "Equipe de gestores e árbitros",
    ],
    destaque: true,
  },
  {
    codigo: "pro",
    nome: "Profissional",
    precoMensal: 79.9,
    precoAnualMes: 63.9,
    descricao: "Para ligas, federações e eventos grandes.",
    limites: { torneios: null, equipes: null, patrocinadores: null },
    recursos: [
      "Campeonatos ilimitados",
      "Equipes ilimitadas",
      "Patrocinadores ilimitados",
      "Tudo do plano Organizador",
      "Suporte prioritário",
    ],
  },
  {
    codigo: "enterprise",
    nome: "Sob medida",
    precoMensal: null,
    precoAnualMes: null,
    descricao: "Prefeituras, federações e redes com necessidades especiais.",
    limites: { torneios: null, equipes: null, patrocinadores: null },
    recursos: ["Tudo do Profissional", "Implantação assistida", "Condições comerciais personalizadas"],
  },
];

export const infoPlano = (codigo?: string | null) => PLANOS.find((p) => p.codigo === codigo) ?? PLANOS[0];

export const formatarPreco = (valor: number | null) =>
  valor == null ? "Sob consulta" : valor === 0 ? "R$ 0" : valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
