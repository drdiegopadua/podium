import { FormEvent, useCallback, useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { CampoImagem } from "../../components/CampoImagem";
import { SeletorEvento, useEventoSelecionado } from "../../components/SeletorEvento";
import { supabase } from "../../lib/supabaseClient";
import { enviarImagem } from "../../lib/upload";
import { useSessao } from "../../contexts/SessaoContext";

type TipoPost = "noticia" | "foto" | "video";
interface Publicacao {
  id: string;
  tipo: TipoPost;
  titulo: string;
  texto: string | null;
  imagem_url: string | null;
  video_url: string | null;
  fixada: boolean;
  criado_em: string;
}

const TIPOS: { id: TipoPost; rotulo: string; icone: string }[] = [
  { id: "noticia", rotulo: "Notícia", icone: "📰" },
  { id: "foto", rotulo: "Foto", icone: "📷" },
  { id: "video", rotulo: "Vídeo", icone: "▶" },
];

export function Mural() {
  const { empresaAtual, sessao } = useSessao();
  const { eventos, eventoId, setEventoId } = useEventoSelecionado();
  const [posts, setPosts] = useState<Publicacao[]>([]);
  const [tipo, setTipo] = useState<TipoPost>("noticia");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [video, setVideo] = useState("");
  const [imagem, setImagem] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("publicacoes")
      .select("*")
      .eq("evento_id", id)
      .order("fixada", { ascending: false })
      .order("criado_em", { ascending: false });
    setPosts((data as Publicacao[]) ?? []);
  }, []);

  useEffect(() => {
    if (eventoId) carregar(eventoId);
  }, [eventoId, carregar]);

  async function publicar(e: FormEvent) {
    e.preventDefault();
    if (!eventoId) return;
    setErro(null);
    if (tipo === "video" && !/^https?:\/\//.test(video.trim())) return setErro("Cole o link do vídeo (YouTube, Instagram...).");
    if (tipo === "foto" && !imagem) return setErro("Escolha a foto.");
    setSalvando(true);
    try {
      const imagem_url = imagem ? await enviarImagem(imagem, `${empresaAtual?.id ?? "x"}/mural`, 1600) : null;
      const { error } = await supabase.from("publicacoes").insert({
        evento_id: eventoId,
        tipo,
        titulo: titulo.trim(),
        texto: texto.trim() || null,
        imagem_url,
        video_url: tipo === "video" ? video.trim() : null,
        autor_id: sessao?.user.id ?? null,
      });
      if (error) throw error;
      setTitulo("");
      setTexto("");
      setVideo("");
      setImagem(null);
      await carregar(eventoId);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao publicar.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarFixada(p: Publicacao) {
    await supabase.from("publicacoes").update({ fixada: !p.fixada }).eq("id", p.id);
    if (eventoId) carregar(eventoId);
  }

  async function excluir(p: Publicacao) {
    if (!confirm(`Excluir "${p.titulo}" do mural?`)) return;
    await supabase.from("publicacoes").delete().eq("id", p.id);
    if (eventoId) carregar(eventoId);
  }

  return (
    <Layout>
      <PageHeader title="Mural do torneio" subtitle="Notícias, fotos e vídeos que aparecem no app" />
      <div className="mb-6">
        <SeletorEvento eventos={eventos} eventoId={eventoId} onChange={setEventoId} />
      </div>

      <div className="grid lg:grid-cols-[420px_1fr] gap-6 items-start">
        <form onSubmit={publicar} className="bg-cartao rounded-2xl border border-borda p-5 space-y-4">
          <h2 className="font-semibold">Nova publicação</h2>
          <div className="flex gap-2">
            {TIPOS.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setTipo(t.id)}
                className={`flex-1 rounded-full border py-2 text-sm font-semibold ${tipo === t.id ? "bg-destaque text-preto border-destaque" : "border-borda text-cinza"}`}
              >
                {t.icone} {t.rotulo}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="block text-sm text-white/80 mb-1">Título</span>
            <input
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={tipo === "foto" ? "Ex.: Galeria da final" : "Ex.: Quartas de final definidas!"}
              className="input"
            />
          </label>
          {tipo === "video" && (
            <label className="block">
              <span className="block text-sm text-white/80 mb-1">Link do vídeo</span>
              <input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://youtube.com/..." className="input" />
            </label>
          )}
          <div>
            <span className="block text-sm text-white/80 mb-2">{tipo === "foto" ? "Foto" : "Imagem de capa (opcional)"}</span>
            <CampoImagem arquivo={imagem} onChange={setImagem} rotulo="Enviar imagem" dica="JPG ou PNG · até 8 MB" />
          </div>
          <label className="block">
            <span className="block text-sm text-white/80 mb-1">Texto {tipo !== "noticia" && "(opcional)"}</span>
            <textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} className="input" />
          </label>
          {erro && <p className="text-sm text-ps-vermelho">{erro}</p>}
          <button disabled={salvando || !eventoId} className="w-full rounded-full bg-destaque text-preto font-semibold py-2.5 text-sm disabled:opacity-50">
            {salvando ? "Publicando..." : "Publicar no app"}
          </button>
        </form>

        <div className="space-y-3">
          {posts.length === 0 && <p className="text-sm text-cinza">Nada publicado neste torneio ainda.</p>}
          {posts.map((p) => (
            <article key={p.id} className="bg-cartao rounded-2xl border border-borda overflow-hidden flex">
              {p.imagem_url && <img src={p.imagem_url} alt="" className="w-36 object-cover shrink-0" />}
              <div className="p-4 flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-cinza">
                      {TIPOS.find((t) => t.id === p.tipo)?.icone} {new Date(p.criado_em).toLocaleString("pt-BR")}
                      {p.fixada && <span className="ml-2 text-destaque font-semibold">📌 Fixada</span>}
                    </div>
                    <h3 className="font-bold truncate">{p.titulo}</h3>
                  </div>
                  <div className="flex gap-3 text-xs shrink-0">
                    <button onClick={() => alternarFixada(p)} className="text-cinza underline">
                      {p.fixada ? "Desafixar" : "Fixar"}
                    </button>
                    <button onClick={() => excluir(p)} className="text-ps-vermelho underline">
                      Excluir
                    </button>
                  </div>
                </div>
                {p.texto && <p className="text-sm text-white/80 mt-1 line-clamp-3 whitespace-pre-line">{p.texto}</p>}
                {p.video_url && (
                  <a href={p.video_url} target="_blank" rel="noreferrer" className="text-xs text-destaque underline break-all">
                    {p.video_url}
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </Layout>
  );
}
