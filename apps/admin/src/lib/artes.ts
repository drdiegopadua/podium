/**
 * Gerador de artes para redes sociais (Instagram feed/stories e WhatsApp).
 * Desenha em <canvas> no navegador, com as cores da empresa e os escudos.
 */

export type FormatoArte = "feed" | "story";

export interface EquipeArte {
  nome: string;
  logo_url?: string | null;
}

export interface Cabecalho {
  torneio: string;
  empresa: string;
  logoTorneio?: string | null;
  destaque: string; // cor de destaque da empresa
  rodape: string; // ex.: arenasportsbr.vercel.app/e/CODIGO
}

export const DIMENSOES: Record<FormatoArte, { w: number; h: number; rotulo: string }> = {
  feed: { w: 1080, h: 1350, rotulo: "Feed (4:5)" },
  story: { w: 1080, h: 1920, rotulo: "Stories / Status (9:16)" },
};

const FUNDO = "#0B0B0C";
const CARTAO = "#17171A";
const BORDA = "#2A2A30";
const CINZA = "#9A9AA3";
const DISPLAY = "Oswald, Impact, sans-serif";
const TEXTO = "Inter, Arial, sans-serif";

/* ------------------------------------------------------------------ */
/* utilitarios                                                         */
/* ------------------------------------------------------------------ */

const cacheImagens = new Map<string, Promise<HTMLImageElement | null>>();

export function carregarImagem(url?: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  if (!cacheImagens.has(url)) {
    cacheImagens.set(
      url,
      new Promise((ok) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => ok(img);
        img.onerror = () => ok(null);
        img.src = url;
      })
    );
  }
  return cacheImagens.get(url)!;
}

export async function prepararFontes() {
  try {
    await Promise.all([
      document.fonts.load(`700 80px Oswald`),
      document.fonts.load(`400 30px Inter`),
      document.fonts.load(`700 30px Inter`),
      document.fonts.load(`800 30px Inter`),
    ]);
  } catch {
    /* segue com fontes do sistema */
  }
}

function retangulo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Escreve texto reduzindo a fonte ate caber na largura. */
function textoAjustado(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  larguraMax: number,
  tamanho: number,
  familia: string,
  peso = "700",
  minimo = 18
) {
  let t = tamanho;
  ctx.font = `${peso} ${t}px ${familia}`;
  while (ctx.measureText(texto).width > larguraMax && t > minimo) {
    t -= 2;
    ctx.font = `${peso} ${t}px ${familia}`;
  }
  let final = texto;
  if (ctx.measureText(final).width > larguraMax) {
    while (final.length > 1 && ctx.measureText(final + "…").width > larguraMax) final = final.slice(0, -1);
    final += "…";
  }
  ctx.fillText(final, x, y);
}

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function escudo(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, nome: string, cx: number, cy: number, tam: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, tam / 2, 0, Math.PI * 2);
  ctx.fillStyle = CARTAO;
  ctx.fill();
  ctx.lineWidth = Math.max(2, tam * 0.025);
  ctx.strokeStyle = BORDA;
  ctx.stroke();
  if (img) {
    ctx.clip();
    const pad = tam * 0.12;
    const lado = tam - pad * 2;
    const escala = Math.min(lado / img.width, lado / img.height);
    const w = img.width * escala;
    const h = img.height * escala;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.fillStyle = CINZA;
    ctx.font = `700 ${tam * 0.36}px ${TEXTO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(iniciais(nome), cx, cy + tam * 0.02);
  }
  ctx.restore();
}

/** Fundo, faixa de destaque, cabecalho do torneio e rodape. Devolve a area util. */
async function moldura(ctx: CanvasRenderingContext2D, formato: FormatoArte, cab: Cabecalho, etiqueta: string, subtitulo?: string) {
  const { w, h } = DIMENSOES[formato];
  ctx.fillStyle = FUNDO;
  ctx.fillRect(0, 0, w, h);

  // formas diagonais de destaque
  ctx.save();
  ctx.fillStyle = cab.destaque;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.moveTo(w * 0.62, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.08;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.78);
  ctx.lineTo(w * 0.55, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // grade sutil
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 2;
  for (let x = 0; x < w; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  ctx.restore();

  const margem = 72;
  let y = formato === "story" ? 150 : 90;

  // cabecalho
  const logo = await carregarImagem(cab.logoTorneio);
  const tamLogo = 112;
  let xTexto = margem;
  if (logo || cab.logoTorneio !== undefined) {
    escudo(ctx, logo, cab.torneio, margem + tamLogo / 2, y + tamLogo / 2, tamLogo);
    xTexto = margem + tamLogo + 28;
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = CINZA;
  textoAjustado(ctx, cab.empresa.toUpperCase(), xTexto, y + 40, w - xTexto - margem - 120, 26, TEXTO, "700");
  ctx.fillStyle = "#FFFFFF";
  textoAjustado(ctx, cab.torneio.toUpperCase(), xTexto, y + 98, w - xTexto - margem, 54, DISPLAY, "700");
  y += tamLogo + 56;

  // etiqueta
  ctx.font = `800 30px ${TEXTO}`;
  const larg = ctx.measureText(etiqueta).width + 56;
  ctx.fillStyle = cab.destaque;
  retangulo(ctx, margem, y, larg, 60, 30);
  ctx.fill();
  ctx.fillStyle = FUNDO;
  ctx.textBaseline = "middle";
  ctx.fillText(etiqueta, margem + 28, y + 31);
  if (subtitulo) {
    ctx.fillStyle = CINZA;
    ctx.font = `600 28px ${TEXTO}`;
    textoAjustado(ctx, subtitulo, margem + larg + 24, y + 31, w - margem * 2 - larg - 24, 28, TEXTO, "600");
  }
  ctx.textBaseline = "alphabetic";
  y += 60 + (formato === "story" ? 80 : 48);

  // rodape
  const yRodape = h - (formato === "story" ? 120 : 70);
  ctx.strokeStyle = BORDA;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margem, yRodape - 46);
  ctx.lineTo(w - margem, yRodape - 46);
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.font = `700 26px ${TEXTO}`;
  ctx.fillStyle = cab.destaque;
  ctx.fillText("ARENA", margem, yRodape);
  const lArena = ctx.measureText("ARENA ").width;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("SPORTS", margem + lArena, yRodape);
  ctx.textAlign = "right";
  ctx.fillStyle = CINZA;
  ctx.font = `500 24px ${TEXTO}`;
  ctx.fillText(cab.rodape, w - margem, yRodape);
  ctx.textAlign = "left";

  return { margem, topo: y, base: yRodape - 80, w, h };
}

function novoCanvas(formato: FormatoArte) {
  const { w, h } = DIMENSOES[formato];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext("2d")! };
}

/* ------------------------------------------------------------------ */
/* artes                                                               */
/* ------------------------------------------------------------------ */

export async function arteResultado(opts: {
  formato: FormatoArte;
  cab: Cabecalho;
  fase: string;
  a: EquipeArte;
  b: EquipeArte;
  placarA: number;
  placarB: number;
  penaltis?: [number, number] | null;
  wo?: boolean;
  golsA: string[];
  golsB: string[];
  data?: string | null;
}) {
  await prepararFontes();
  const { canvas, ctx } = novoCanvas(opts.formato);
  const area = await moldura(ctx, opts.formato, opts.cab, opts.wo ? "W.O." : "RESULTADO FINAL", opts.fase);
  const { w, margem } = area;
  const story = opts.formato === "story";
  const tam = story ? 300 : 250;
  const yEscudo = area.topo + tam / 2 + (story ? 40 : 0);
  const [imgA, imgB] = await Promise.all([carregarImagem(opts.a.logo_url), carregarImagem(opts.b.logo_url)]);
  const xA = margem + tam / 2 + 10;
  const xB = w - margem - tam / 2 - 10;
  escudo(ctx, imgA, opts.a.nome, xA, yEscudo, tam);
  escudo(ctx, imgB, opts.b.nome, xB, yEscudo, tam);

  // placar
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 ${story ? 200 : 170}px ${DISPLAY}`;
  ctx.fillText(`${opts.placarA}`, w / 2 - (story ? 95 : 80), yEscudo + 60);
  ctx.fillText(`${opts.placarB}`, w / 2 + (story ? 95 : 80), yEscudo + 60);
  ctx.fillStyle = opts.cab.destaque;
  ctx.font = `700 ${story ? 110 : 90}px ${DISPLAY}`;
  ctx.fillText("-", w / 2, yEscudo + 40);
  if (opts.penaltis) {
    ctx.fillStyle = CINZA;
    ctx.font = `600 30px ${TEXTO}`;
    ctx.fillText(`Pênaltis ${opts.penaltis[0]} - ${opts.penaltis[1]}`, w / 2, yEscudo + 125);
  }

  // nomes
  let y = yEscudo + tam / 2 + 70;
  ctx.fillStyle = "#FFFFFF";
  const largNome = w / 2 - margem - 20;
  textoAjustado(ctx, opts.a.nome.toUpperCase(), xA, y, largNome, 44, DISPLAY, "700");
  textoAjustado(ctx, opts.b.nome.toUpperCase(), xB, y, largNome, 44, DISPLAY, "700");

  // gols
  y += story ? 110 : 70;
  const maxLinhas = story ? 9 : 5;
  const listar = (gols: string[], x: number) => {
    ctx.fillStyle = "#E6E6EA";
    ctx.font = `500 30px ${TEXTO}`;
    gols.slice(0, maxLinhas).forEach((g, i) => textoAjustado(ctx, `⚽ ${g}`, x, y + i * 46, largNome, 30, TEXTO, "500"));
    if (gols.length > maxLinhas) {
      ctx.fillStyle = CINZA;
      ctx.fillText(`+${gols.length - maxLinhas}`, x, y + maxLinhas * 46);
    }
  };
  listar(opts.golsA, xA);
  listar(opts.golsB, xB);

  if (opts.data) {
    ctx.fillStyle = CINZA;
    ctx.font = `500 26px ${TEXTO}`;
    ctx.fillText(opts.data, w / 2, area.base);
  }
  ctx.textAlign = "left";
  return canvas;
}

export interface LinhaTabelaArte {
  equipe: EquipeArte;
  pontos: number;
  jogos: number;
  vitorias: number;
  saldo: number;
}

export async function arteClassificacao(opts: {
  formato: FormatoArte;
  cab: Cabecalho;
  titulo: string;
  linhas: LinhaTabelaArte[];
  zona: number;
}) {
  await prepararFontes();
  const { canvas, ctx } = novoCanvas(opts.formato);
  const area = await moldura(ctx, opts.formato, opts.cab, "CLASSIFICAÇÃO", opts.titulo);
  const { w, margem } = area;
  const linhas = opts.linhas.slice(0, opts.formato === "story" ? 16 : 12);
  const cabecalhoH = 50;
  const altura = Math.min(opts.formato === "story" ? 110 : 96, (area.base - area.topo - cabecalhoH) / Math.max(linhas.length, 1));
  area.topo += Math.max(0, (area.base - area.topo - cabecalhoH - altura * linhas.length) / 2);
  const colunas = [
    { r: "P", x: w - margem - 330 },
    { r: "J", x: w - margem - 230 },
    { r: "V", x: w - margem - 140 },
    { r: "SG", x: w - margem - 40 },
  ];
  ctx.fillStyle = CINZA;
  ctx.font = `700 24px ${TEXTO}`;
  ctx.textAlign = "center";
  colunas.forEach((c) => ctx.fillText(c.r, c.x, area.topo + 24));
  ctx.textAlign = "left";
  ctx.fillText("EQUIPE", margem + 90, area.topo + 24);

  const imgs = await Promise.all(linhas.map((l) => carregarImagem(l.equipe.logo_url)));
  linhas.forEach((l, i) => {
    const y = area.topo + cabecalhoH + i * altura;
    const meio = y + altura / 2;
    if (i % 2 === 0) {
      ctx.fillStyle = CARTAO;
      retangulo(ctx, margem - 16, y + 4, w - margem * 2 + 32, altura - 8, 18);
      ctx.fill();
    }
    const naZona = i < opts.zona;
    ctx.fillStyle = naZona ? opts.cab.destaque : "transparent";
    retangulo(ctx, margem, meio - 22, 44, 44, 10);
    ctx.fill();
    ctx.fillStyle = naZona ? FUNDO : CINZA;
    ctx.font = `800 26px ${TEXTO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i + 1), margem + 22, meio + 1);
    const tamEsc = Math.min(64, altura - 22);
    escudo(ctx, imgs[i], l.equipe.nome, margem + 90 + tamEsc / 2, meio, tamEsc);
    ctx.textAlign = "left";
    ctx.fillStyle = "#FFFFFF";
    textoAjustado(ctx, l.equipe.nome, margem + 110 + tamEsc, meio + 2, colunas[0].x - (margem + 140 + tamEsc), 32, TEXTO, "700");
    ctx.textAlign = "center";
    const valores = [l.pontos, l.jogos, l.vitorias, l.saldo];
    valores.forEach((v, k) => {
      ctx.fillStyle = k === 0 ? opts.cab.destaque : "#E6E6EA";
      ctx.font = `${k === 0 ? 800 : 600} ${k === 0 ? 36 : 30}px ${TEXTO}`;
      ctx.fillText(k === 3 && v > 0 ? `+${v}` : String(v), colunas[k].x, meio + 1);
    });
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  });
  return canvas;
}

export interface ItemRankingArte {
  jogador: string;
  equipe: EquipeArte;
  total: number;
}

export async function arteRanking(opts: {
  formato: FormatoArte;
  cab: Cabecalho;
  etiqueta: string;
  unidade: string;
  itens: ItemRankingArte[];
}) {
  await prepararFontes();
  const { canvas, ctx } = novoCanvas(opts.formato);
  const area = await moldura(ctx, opts.formato, opts.cab, opts.etiqueta);
  const { w, margem } = area;
  const itens = opts.itens.slice(0, opts.formato === "story" ? 12 : 8);
  const altura = Math.min(opts.formato === "story" ? 150 : 130, (area.base - area.topo) / Math.max(itens.length, 1));
  area.topo += Math.max(0, (area.base - area.topo - altura * itens.length) / 2);
  const imgs = await Promise.all(itens.map((i) => carregarImagem(i.equipe.logo_url)));
  itens.forEach((it, i) => {
    const y = area.topo + i * altura;
    const meio = y + altura / 2;
    const lider = i === 0;
    ctx.fillStyle = lider ? opts.cab.destaque : CARTAO;
    retangulo(ctx, margem - 16, y + 6, w - margem * 2 + 32, altura - 12, 24);
    ctx.fill();
    const corTexto = lider ? FUNDO : "#FFFFFF";
    ctx.fillStyle = lider ? FUNDO : CINZA;
    ctx.font = `800 34px ${TEXTO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i + 1), margem + 24, meio);
    const tamEsc = Math.min(80, altura - 34);
    escudo(ctx, imgs[i], it.equipe.nome, margem + 80 + tamEsc / 2, meio, tamEsc);
    ctx.textAlign = "left";
    const xNome = margem + 104 + tamEsc;
    ctx.fillStyle = corTexto;
    textoAjustado(ctx, it.jogador, xNome, meio - 14, w - xNome - margem - 170, 36, TEXTO, "800");
    ctx.fillStyle = lider ? "rgba(0,0,0,0.6)" : CINZA;
    textoAjustado(ctx, it.equipe.nome, xNome, meio + 26, w - xNome - margem - 170, 26, TEXTO, "500");
    ctx.textAlign = "right";
    ctx.fillStyle = lider ? FUNDO : opts.cab.destaque;
    ctx.font = `700 64px ${DISPLAY}`;
    ctx.fillText(String(it.total), w - margem - 70, meio + 4);
    ctx.font = `600 22px ${TEXTO}`;
    ctx.fillStyle = lider ? "rgba(0,0,0,0.6)" : CINZA;
    ctx.fillText(opts.unidade, w - margem, meio + 10);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  });
  return canvas;
}

export interface JogoArte {
  a: EquipeArte;
  b: EquipeArte;
  quando: string;
  local?: string | null;
}

export async function arteProximos(opts: { formato: FormatoArte; cab: Cabecalho; titulo: string; jogos: JogoArte[] }) {
  await prepararFontes();
  const { canvas, ctx } = novoCanvas(opts.formato);
  const area = await moldura(ctx, opts.formato, opts.cab, "PRÓXIMOS JOGOS", opts.titulo);
  const { w, margem } = area;
  const jogos = opts.jogos.slice(0, opts.formato === "story" ? 8 : 6);
  const altura = Math.min(opts.formato === "story" ? 230 : 190, (area.base - area.topo) / Math.max(jogos.length, 1));
  area.topo += Math.max(0, (area.base - area.topo - altura * jogos.length) / 2);
  const imgs = await Promise.all(jogos.flatMap((j) => [carregarImagem(j.a.logo_url), carregarImagem(j.b.logo_url)]));
  jogos.forEach((j, i) => {
    const y = area.topo + i * altura;
    ctx.fillStyle = CARTAO;
    retangulo(ctx, margem - 16, y + 8, w - margem * 2 + 32, altura - 16, 26);
    ctx.fill();
    const meio = y + altura / 2 + 14;
    ctx.textAlign = "center";
    ctx.fillStyle = opts.cab.destaque;
    ctx.font = `700 24px ${TEXTO}`;
    ctx.fillText([j.quando, j.local].filter(Boolean).join("  ·  "), w / 2, y + 48);
    const tamEsc = Math.min(76, altura - 90);
    escudo(ctx, imgs[i * 2], j.a.nome, margem + 30 + tamEsc / 2, meio, tamEsc);
    escudo(ctx, imgs[i * 2 + 1], j.b.nome, w - margem - 30 - tamEsc / 2, meio, tamEsc);
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "middle";
    const larg = w / 2 - margem - tamEsc - 110;
    ctx.textAlign = "left";
    textoAjustado(ctx, j.a.nome, margem + 50 + tamEsc, meio, larg, 32, TEXTO, "800");
    ctx.textAlign = "right";
    textoAjustado(ctx, j.b.nome, w - margem - 50 - tamEsc, meio, larg, 32, TEXTO, "800");
    ctx.textAlign = "center";
    ctx.fillStyle = CINZA;
    ctx.font = `700 34px ${DISPLAY}`;
    ctx.fillText("X", w / 2, meio);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
  });
  return canvas;
}

/* ------------------------------------------------------------------ */
/* exportar                                                            */
/* ------------------------------------------------------------------ */

export function canvasParaBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((ok, erro) =>
    canvas.toBlob((b) => (b ? ok(b) : erro(new Error("Não foi possível gerar a imagem."))), "image/png")
  );
}

export async function baixar(canvas: HTMLCanvasElement, nome: string) {
  const blob = await canvasParaBlob(canvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nome}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function compartilhar(canvas: HTMLCanvasElement, nome: string, texto: string) {
  const blob = await canvasParaBlob(canvas);
  const arquivo = new File([blob], `${nome}.png`, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [arquivo] })) {
    await nav.share({ files: [arquivo], text: texto });
    return true;
  }
  return false;
}
