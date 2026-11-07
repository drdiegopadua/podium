import { usePatrocinadores } from "../lib/divulgacao";
import { useTorneio } from "../lib/torneio";

/** Faixa de patrocinadores do torneio atual (rolavel na horizontal). */
export function FaixaPatrocinadores({ className = "" }: { className?: string }) {
  const { torneio } = useTorneio();
  const lista = usePatrocinadores(torneio?.empresa?.id, torneio?.id);
  if (lista.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="px-5 mb-2 text-[11px] font-semibold uppercase tracking-wide text-cinza">Patrocinadores</h2>
      <div className="flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {lista.map((p) => {
          const conteudo = (
            <>
              <div className="h-14 w-full rounded-xl bg-white flex items-center justify-center overflow-hidden">
                {p.logo_url ? (
                  <img src={p.logo_url} alt={p.nome} loading="lazy" className="max-h-full max-w-full object-contain p-2" />
                ) : (
                  <span className="text-preto text-sm font-bold">{p.nome}</span>
                )}
              </div>
              <div className="mt-1.5 text-[10px] uppercase tracking-wide text-cinza truncate">{p.chamada}</div>
              <div className="text-xs font-semibold truncate">{p.nome}</div>
            </>
          );
          const classe = "shrink-0 w-32 rounded-2xl bg-cartao border border-borda p-2.5";
          return p.link ? (
            <a key={p.id} href={p.link} target="_blank" rel="noreferrer" className={classe}>
              {conteudo}
            </a>
          ) : (
            <div key={p.id} className={classe}>
              {conteudo}
            </div>
          );
        })}
      </div>
    </section>
  );
}
