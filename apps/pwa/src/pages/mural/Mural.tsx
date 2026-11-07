import { PwaLayout } from "../../components/PwaLayout";
import { EntrarTorneio } from "../../components/EntrarTorneio";
import { useTorneio } from "../../lib/torneio";
import { embedYoutube, tempoRelativo, usePublicacoes, type Publicacao } from "../../lib/divulgacao";

export function Mural() {
  const { torneio } = useTorneio();
  const { posts, carregando } = usePublicacoes(torneio?.id);

  if (!torneio) {
    return (
      <PwaLayout>
        <div className="p-5 pt-10">
          <EntrarTorneio />
        </div>
      </PwaLayout>
    );
  }

  return (
    <PwaLayout>
      <div className="px-5 pt-6 space-y-4">
        <h1 className="text-center text-lg font-semibold">Mural</h1>
        {carregando && <p className="text-sm text-cinza">Carregando...</p>}
        {!carregando && posts.length === 0 && (
          <p className="rounded-2xl bg-cartao border border-borda p-4 text-sm text-cinza">
            O organizador ainda não publicou notícias, fotos ou vídeos.
          </p>
        )}
        {posts.map((p) => (
          <Post key={p.id} post={p} />
        ))}
      </div>
    </PwaLayout>
  );
}

export function Post({ post, compacto = false }: { post: Publicacao; compacto?: boolean }) {
  const embed = embedYoutube(post.video_url);
  const rotulo = post.tipo === "foto" ? "Foto" : post.tipo === "video" ? "Vídeo" : "Notícia";
  return (
    <article className="rounded-3xl bg-cartao border border-borda overflow-hidden">
      {!compacto && embed ? (
        <div className="aspect-video bg-black">
          <iframe
            src={embed}
            title={post.titulo}
            className="w-full h-full"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : (
        post.imagem_url && (
          <img src={post.imagem_url} alt="" loading="lazy" className={`w-full object-cover ${compacto ? "h-36" : "max-h-[480px]"}`} />
        )
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 text-[11px] text-cinza">
          {post.fixada && <span className="text-destaque font-semibold">📌 Fixado</span>}
          <span className="uppercase tracking-wide">{rotulo}</span>
          <span>·</span>
          <span>{tempoRelativo(post.criado_em)}</span>
        </div>
        <h2 className="mt-1 font-bold leading-snug">{post.titulo}</h2>
        {post.texto && (
          <p className={`mt-1.5 text-sm text-white/80 whitespace-pre-line ${compacto ? "line-clamp-2" : ""}`}>{post.texto}</p>
        )}
        {post.video_url && (compacto || !embed) && (
          <a href={post.video_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-destaque">
            ▶ Assistir vídeo
          </a>
        )}
      </div>
    </article>
  );
}
