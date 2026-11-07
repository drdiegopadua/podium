import { supabase } from "./supabaseClient";

const BUCKET = "logos-eventos";
const TAMANHO_MAX_MB = 8;

/**
 * Reduz a imagem (lado maior <= ladoMax) e converte para WebP mantendo transparencia,
 * para logos e escudos ficarem leves no app. SVG e GIF sao enviados como estao.
 */
async function otimizar(arquivo: File, ladoMax: number): Promise<Blob> {
  if (arquivo.type === "image/svg+xml" || arquivo.type === "image/gif") return arquivo;
  const bitmap = await createImageBitmap(arquivo).catch(() => null);
  if (!bitmap) return arquivo;
  const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.9));
  return blob ?? arquivo;
}

export function validarImagem(arquivo: File): string | null {
  if (!arquivo.type.startsWith("image/")) return "Escolha um arquivo de imagem (PNG, JPG, WebP ou SVG).";
  if (arquivo.size > TAMANHO_MAX_MB * 1024 * 1024) return `A imagem precisa ter até ${TAMANHO_MAX_MB} MB.`;
  return null;
}

/** Envia a imagem para o Storage e devolve a URL publica. */
export async function enviarImagem(arquivo: File, pasta: string, ladoMax = 512): Promise<string> {
  const erro = validarImagem(arquivo);
  if (erro) throw new Error(erro);
  const blob = await otimizar(arquivo, ladoMax);
  const extensao = blob.type === "image/webp" ? "webp" : (arquivo.name.split(".").pop() ?? "png");
  const caminho = `${pasta}/${Date.now()}-${crypto.randomUUID().slice(0, 6)}.${extensao}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, blob, { contentType: blob.type || arquivo.type, cacheControl: "31536000" });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}
