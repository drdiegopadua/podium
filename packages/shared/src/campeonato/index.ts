/**
 * Motor do campeonato: geracao da tabela de jogos e ordenacao da classificacao.
 * Usado pelo painel (gerar tabela) e pelo app (exibir classificacao com desempate).
 */
import type { Classificacao, CriterioDesempate, Jogo } from "../types";

export interface NovoJogo {
  id: string;
  evento_id: string;
  etapa: "classificatoria" | "mata_mata";
  rodada: number;
  grupo: string | null;
  ordem: number;
  fase: string;
  equipe_a_id: string | null;
  equipe_b_id: string | null;
  proximo_jogo_id: string | null;
  proximo_lado: "a" | "b" | null;
  perdedor_jogo_id: string | null;
  perdedor_lado: "a" | "b" | null;
  status: "agendado";
}

const novoId = () => crypto.randomUUID();

/* ------------------------------------------------------------------ */
/* Todos contra todos (metodo do circulo)                              */
/* ------------------------------------------------------------------ */

/** Rodadas de um turno. Com numero impar de equipes, uma folga por rodada. */
export function todosContraTodos(times: string[]): [string, string][][] {
  const lista: (string | null)[] = [...times];
  if (lista.length < 2) return [];
  if (lista.length % 2 === 1) lista.push(null);
  const n = lista.length;
  const rodadas: [string, string][][] = [];
  let atual = [...lista];
  for (let r = 0; r < n - 1; r++) {
    const jogos: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = atual[i];
      const b = atual[n - 1 - i];
      if (a && b) {
        // alterna mando para equilibrar
        jogos.push(r % 2 === 0 ? [a, b] : [b, a]);
      }
    }
    rodadas.push(jogos);
    // fixa o primeiro, gira o resto
    atual = [atual[0], atual[n - 1], ...atual.slice(1, n - 1)];
  }
  return rodadas;
}

/** Jogos da fase classificatoria (pontos corridos ou grupos). */
export function gerarClassificatoria(opts: {
  eventoId: string;
  grupos: { nome: string | null; times: string[] }[];
  idaVolta: boolean;
}): NovoJogo[] {
  const jogos: NovoJogo[] = [];
  let ordem = 0;
  const porGrupo = opts.grupos.map((g) => {
    const turno = todosContraTodos(g.times);
    const returno = opts.idaVolta ? turno.map((r) => r.map(([a, b]) => [b, a] as [string, string])) : [];
    return { nome: g.nome, rodadas: [...turno, ...returno] };
  });
  const maxRodadas = Math.max(0, ...porGrupo.map((g) => g.rodadas.length));
  for (let r = 0; r < maxRodadas; r++) {
    for (const g of porGrupo) {
      for (const [a, b] of g.rodadas[r] ?? []) {
        jogos.push({
          id: novoId(),
          evento_id: opts.eventoId,
          etapa: "classificatoria",
          rodada: r + 1,
          grupo: g.nome,
          ordem: ordem++,
          fase: g.nome ? `Grupo ${g.nome} · Rodada ${r + 1}` : `Rodada ${r + 1}`,
          equipe_a_id: a,
          equipe_b_id: b,
          proximo_jogo_id: null,
          proximo_lado: null,
          perdedor_jogo_id: null,
          perdedor_lado: null,
          status: "agendado",
        });
      }
    }
  }
  return jogos;
}

/** Divide equipes em grupos (respeita grupo ja sorteado; distribui as demais). */
export function montarGrupos(
  equipes: { id: string; posicao_grupo?: string | null }[],
  qtdGrupos: number
): { nome: string; times: string[] }[] {
  const letras = "ABCDEFGHIJKLMNOP".slice(0, Math.max(1, qtdGrupos)).split("");
  const grupos = new Map(letras.map((l) => [l, [] as string[]]));
  const semGrupo: string[] = [];
  for (const e of equipes) {
    const g = e.posicao_grupo && grupos.has(e.posicao_grupo) ? e.posicao_grupo : null;
    if (g) grupos.get(g)!.push(e.id);
    else semGrupo.push(e.id);
  }
  for (const id of semGrupo) {
    const menor = letras.reduce((m, l) => (grupos.get(l)!.length < grupos.get(m)!.length ? l : m), letras[0]);
    grupos.get(menor)!.push(id);
  }
  return letras.map((l) => ({ nome: l, times: grupos.get(l)! })).filter((g) => g.times.length > 0);
}

/* ------------------------------------------------------------------ */
/* Mata-mata                                                           */
/* ------------------------------------------------------------------ */

export function nomeFaseMataMata(jogosNaRodada: number, rodada: number) {
  if (jogosNaRodada === 1) return "Final";
  if (jogosNaRodada === 2) return "Semifinal";
  if (jogosNaRodada === 4) return "Quartas de final";
  if (jogosNaRodada === 8) return "Oitavas de final";
  if (jogosNaRodada === 16) return "16 avos de final";
  return `${rodada}ª fase`;
}

/** Ordem classica de cabecas de chave: 1x8, 4x5, 2x7, 3x6 ... */
function ordemCabecas(tamanho: number): number[] {
  let ordem = [1];
  while (ordem.length < tamanho) {
    const total = ordem.length * 2 + 1;
    ordem = ordem.flatMap((s) => [s, total - s]);
  }
  return ordem;
}

/** Pares da 1a rodada a partir de uma lista ordenada por forca; completa com folgas (null). */
export function semearPares(cabecas: string[]): [string | null, string | null][] {
  let tamanho = 1;
  while (tamanho < cabecas.length) tamanho *= 2;
  const ordem = ordemCabecas(Math.max(2, tamanho));
  const pares: [string | null, string | null][] = [];
  for (let i = 0; i < ordem.length; i += 2) {
    pares.push([cabecas[ordem[i] - 1] ?? null, cabecas[ordem[i + 1] - 1] ?? null]);
  }
  return pares;
}

/**
 * Cruzamento entre grupos (1A x 2B, 1C x 2D, 1B x 2A, 1D x 2C ...).
 * Cai para cabecas de chave quando o cruzamento nao fecha uma chave potencia de 2.
 */
export function paresDosGrupos(classificados: string[][]): [string | null, string | null][] {
  const k = classificados[0]?.length ?? 0;
  const total = classificados.reduce((s, g) => s + g.length, 0);
  const potencia2 = total > 1 && (total & (total - 1)) === 0;
  const mesmoTamanho = classificados.every((g) => g.length === k);
  if (classificados.length % 2 === 0 && potencia2 && mesmoTamanho && k > 0) {
    const metade1: [string, string][] = [];
    const metade2: [string, string][] = [];
    for (let g = 0; g < classificados.length; g += 2) {
      const A = classificados[g];
      const B = classificados[g + 1];
      for (let i = 0; i < k; i++) {
        const par: [string, string] = i % 2 === 0 ? [A[i], B[k - 1 - i]] : [B[k - 1 - i], A[i]];
        (i % 2 === 0 ? metade1 : metade2).push(par);
      }
    }
    return [...metade1, ...metade2];
  }
  // fallback: todos os 1os, depois os 2os... como cabecas de chave
  const cabecas: string[] = [];
  for (let pos = 0; pos < Math.max(...classificados.map((g) => g.length)); pos++) {
    for (const g of classificados) if (g[pos]) cabecas.push(g[pos]);
  }
  return semearPares(cabecas);
}

/** Monta a chave completa (todas as rodadas ate a final), ligando vencedores ao proximo jogo. */
export function gerarChave(opts: {
  eventoId: string;
  pares: [string | null, string | null][];
  terceiroLugar: boolean;
  ordemInicial?: number;
}): NovoJogo[] {
  const { eventoId } = opts;
  let ordem = opts.ordemInicial ?? 1000;
  const rodadas: (NovoJogo | null)[][] = [];
  let qtd = opts.pares.length;
  let r = 1;
  // cria a arvore inteira
  while (qtd >= 1) {
    const rodada: NovoJogo[] = [];
    for (let i = 0; i < qtd; i++) {
      rodada.push({
        id: novoId(),
        evento_id: eventoId,
        etapa: "mata_mata",
        rodada: r,
        grupo: null,
        ordem: 0,
        fase: nomeFaseMataMata(qtd, r),
        equipe_a_id: null,
        equipe_b_id: null,
        proximo_jogo_id: null,
        proximo_lado: null,
        perdedor_jogo_id: null,
        perdedor_lado: null,
        status: "agendado",
      });
    }
    rodadas.push(rodada);
    if (qtd === 1) break;
    qtd = Math.ceil(qtd / 2);
    r++;
  }
  // liga cada jogo ao seguinte
  for (let ri = 0; ri < rodadas.length - 1; ri++) {
    rodadas[ri].forEach((j, i) => {
      const pai = rodadas[ri + 1][Math.floor(i / 2)]!;
      j!.proximo_jogo_id = pai.id;
      j!.proximo_lado = i % 2 === 0 ? "a" : "b";
    });
  }
  // 1a rodada: preenche times; folga leva o time direto para o proximo jogo
  opts.pares.forEach(([a, b], i) => {
    const jogo = rodadas[0][i]!;
    if (a && b) {
      jogo.equipe_a_id = a;
      jogo.equipe_b_id = b;
      return;
    }
    const quemPassa = a ?? b;
    if (rodadas.length > 1 && quemPassa) {
      const pai = rodadas[1].find((p) => p!.id === jogo.proximo_jogo_id)!;
      if (jogo.proximo_lado === "a") pai.equipe_a_id = quemPassa;
      else pai.equipe_b_id = quemPassa;
    }
    rodadas[0][i] = null; // jogo de folga nao existe
  });
  // disputa de 3o lugar
  const semis = rodadas.length >= 2 ? rodadas[rodadas.length - 2] : [];
  const todos: NovoJogo[] = [];
  if (opts.terceiroLugar && semis.length === 2 && semis.every(Boolean)) {
    const terceiro: NovoJogo = {
      ...rodadas[rodadas.length - 1][0]!,
      id: novoId(),
      fase: "Disputa de 3º lugar",
      proximo_jogo_id: null,
      proximo_lado: null,
      equipe_a_id: null,
      equipe_b_id: null,
    };
    semis[0]!.perdedor_jogo_id = terceiro.id;
    semis[0]!.perdedor_lado = "a";
    semis[1]!.perdedor_jogo_id = terceiro.id;
    semis[1]!.perdedor_lado = "b";
    rodadas.forEach((rod, ri) => {
      if (ri === rodadas.length - 1) {
        terceiro.ordem = ordem++;
        todos.push(terceiro);
      }
      rod.forEach((j) => j && todos.push({ ...j, ordem: ordem++ }));
    });
    return todos;
  }
  for (const rod of rodadas) for (const j of rod) if (j) todos.push({ ...j, ordem: ordem++ });
  return todos;
}

/* ------------------------------------------------------------------ */
/* Classificacao                                                       */
/* ------------------------------------------------------------------ */

export interface LinhaClassificacao extends Classificacao {
  equipe?: { nome: string; logo_url?: string | null } | null;
}

function pontosConfronto(jogos: Pick<Jogo, "equipe_a_id" | "equipe_b_id" | "placar_a" | "placar_b" | "status" | "etapa">[], x: string, y: string) {
  let px = 0;
  let py = 0;
  for (const j of jogos) {
    if (j.etapa === "mata_mata" || j.status !== "encerrado") continue;
    const ida = j.equipe_a_id === x && j.equipe_b_id === y;
    const volta = j.equipe_a_id === y && j.equipe_b_id === x;
    if (!ida && !volta) continue;
    const gx = ida ? j.placar_a ?? 0 : j.placar_b ?? 0;
    const gy = ida ? j.placar_b ?? 0 : j.placar_a ?? 0;
    if (gx > gy) px += 3;
    else if (gy > gx) py += 3;
    else {
      px += 1;
      py += 1;
    }
  }
  return px - py;
}

/** Ordena por pontos e depois pelos criterios de desempate do torneio, na ordem escolhida. */
export function ordenarClassificacao<T extends LinhaClassificacao>(
  linhas: T[],
  criterios: CriterioDesempate[] = ["vitorias", "saldo", "pontos_pro", "confronto_direto"],
  jogos: Pick<Jogo, "equipe_a_id" | "equipe_b_id" | "placar_a" | "placar_b" | "status" | "etapa">[] = []
): T[] {
  return [...linhas].sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    for (const c of criterios) {
      let d = 0;
      if (c === "vitorias") d = b.vitorias - a.vitorias;
      else if (c === "saldo") d = b.saldo - a.saldo;
      else if (c === "pontos_pro") d = (b.gols_pro ?? 0) - (a.gols_pro ?? 0);
      else if (c === "confronto_direto") d = -pontosConfronto(jogos, a.equipe_id, b.equipe_id);
      else if (c === "menos_cartoes")
        d =
          (a.cartoes_vermelhos ?? 0) * 3 + (a.cartoes_amarelos ?? 0) -
          ((b.cartoes_vermelhos ?? 0) * 3 + (b.cartoes_amarelos ?? 0));
      if (d !== 0) return d;
    }
    return (a.equipe?.nome ?? "").localeCompare(b.equipe?.nome ?? "");
  });
}

/** Agrupa a classificacao por grupo ("" = tabela unica), ja ordenada. */
export function classificacaoPorGrupo<T extends LinhaClassificacao>(
  linhas: T[],
  criterios?: CriterioDesempate[],
  jogos?: Parameters<typeof ordenarClassificacao>[2]
): { grupo: string; linhas: T[] }[] {
  const grupos = Array.from(new Set(linhas.map((l) => l.grupo ?? ""))).sort();
  return grupos.map((g) => ({
    grupo: g,
    linhas: ordenarClassificacao(
      linhas.filter((l) => (l.grupo ?? "") === g),
      criterios,
      jogos
    ),
  }));
}
