import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export interface Publicacao {
  id: string;
  evento_id: string;
  tipo: "noticia" | "foto" | "video";
  titulo: string;
  texto: string | null;
  imagem_url: string | null;
  video_url: string | null;
  fixada: boolean;
  criado_em: string;
}

export interface Patrocinador {
  id: string;
  nome: string;
  logo_url: string | null;
  link: string | null;
  chamada: string | null;
}

/** Publicacoes do mural do torneio (fixadas primeiro), em tempo real. */
export function usePublicacoes(eventoId: string | undefined, limite = 50) {
  const [posts, setPosts] = useState<Publicacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    if (!eventoId) return;
    const carregar = () =>
      supabase
        .from("publicacoes")
        .select("*")
        .eq("evento_id", eventoId)
        .order("fixada", { ascending: false })
        .order("criado_em", { ascending: false })
        .limit(limite)
        .then(({ data }) => {
          setPosts((data as Publicacao[]) ?? []);
          setCarregando(false);
        });
    carregar();
    const canal = supabase
      .channel(`mural-${eventoId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "publicacoes", filter: `evento_id=eq.${eventoId}` }, () =>
        carregar()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [eventoId, limite]);
  return { posts, carregando };
}

/** Patrocinadores ativos da empresa (gerais) e do torneio. */
export function usePatrocinadores(empresaId: string | undefined, eventoId: string | undefined) {
  const [lista, setLista] = useState<Patrocinador[]>([]);
  useEffect(() => {
    if (!empresaId) return;
    let q = supabase
      .from("patrocinadores")
      .select("id, nome, logo_url, link, chamada")
      .eq("empresa_id", empresaId)
      .eq("ativo", true)
      .order("ordem");
    q = eventoId ? q.or(`evento_id.is.null,evento_id.eq.${eventoId}`) : q.is("evento_id", null);
    q.then(({ data }) => setLista((data as Patrocinador[]) ?? []));
  }, [empresaId, eventoId]);
  return lista;
}

/** Converte link do YouTube em endereco de incorporacao. */
export function embedYoutube(url: string | null): string | null {
  if (!url) return null;
  const m =
    url.match(/youtu\.be\/([\w-]{11})/) ||
    url.match(/[?&]v=([\w-]{11})/) ||
    url.match(/youtube\.com\/(?:embed|shorts|live)\/([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

export function tempoRelativo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 604800) return `há ${Math.floor(s / 86400)} d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}
