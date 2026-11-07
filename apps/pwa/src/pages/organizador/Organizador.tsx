import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FORMATOS_EVENTO } from "@arena/shared";
import { PwaLayout } from "../../components/PwaLayout";
import { Escudo } from "../../components/Escudo";
import { supabase } from "../../lib/supabaseClient";
import { useTorneio } from "../../lib/torneio";

interface EmpresaPublica {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
  cor_secundaria: string | null;
}
interface TorneioResumo {
  id: string;
  nome: string;
  cidade: string;
  logo_url: string | null;
  formato: string;
  status: string;
  qtd_equipes: number;
  codigo_evento: string;
  data_inicio: string;
  esporte: { nome: string } | null;
}

const STATUS: Record<string, string> = {
  inscricoes_abertas: "Inscrições abertas",
  sorteio_realizado: "Em breve",
  em_andamento: "Em andamento",
  encerrado: "Encerrado",
};

export function Organizador() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { abrir } = useTorneio();
  const [empresa, setEmpresa] = useState<EmpresaPublica | null>(null);
  const [torneios, setTorneios] = useState<TorneioResumo[]>([]);
  const [estado, setEstado] = useState<"carregando" | "ok" | "nao_achou">("carregando");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: e } = await supabase
        .from("empresas")
        .select("id, nome, slug, logo_url, cor_secundaria")
        .eq("slug", slug)
        .maybeSingle();
      if (!e) return setEstado("nao_achou");
      setEmpresa(e as EmpresaPublica);
      const { data: t } = await supabase
        .from("eventos")
        .select("id, nome, cidade, logo_url, formato, status, qtd_equipes, codigo_evento, data_inicio, esporte:esportes(nome)")
        .eq("empresa_id", e.id)
        .neq("status", "rascunho")
        .order("data_inicio", { ascending: false });
      setTorneios((t as unknown as TorneioResumo[]) ?? []);
      setEstado("ok");
    })();
  }, [slug]);

  async function entrar(t: TorneioResumo) {
    if (await abrir(t.codigo_evento)) navigate("/");
  }

  async function compartilharPagina() {
    const url = window.location.href;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      await nav.share({ title: empresa?.nome, url }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    }
  }

  if (estado === "carregando") {
    return (
      <PwaLayout>
        <p className="pt-24 text-center text-sm text-cinza">Carregando...</p>
      </PwaLayout>
    );
  }
  if (estado === "nao_achou" || !empresa) {
    return (
      <PwaLayout>
        <p className="pt-24 text-center text-sm text-cinza">Organizador não encontrado.</p>
      </PwaLayout>
    );
  }

  const andamento = torneios.filter((t) => t.status !== "encerrado");
  const encerrados = torneios.filter((t) => t.status === "encerrado");

  return (
    <PwaLayout>
      <div className="px-5 pt-8 space-y-6">
        <header className="text-center">
          <div className="mx-auto w-24 h-24">
            <Escudo nome={empresa.nome} url={empresa.logo_url} tamanho={96} />
          </div>
          <h1 className="mt-3 text-2xl font-bold">{empresa.nome}</h1>
          <p className="text-sm text-cinza">
            Organizador · {torneios.length} campeonato{torneios.length === 1 ? "" : "s"}
          </p>
          <button onClick={compartilharPagina} className="mt-3 rounded-full border border-borda px-4 py-2 text-xs font-semibold">
            {copiado ? "Link copiado!" : "↗ Compartilhar página"}
          </button>
        </header>

        {torneios.length === 0 && (
          <p className="rounded-2xl bg-cartao border border-borda p-4 text-sm text-cinza text-center">
            Nenhum campeonato publicado ainda.
          </p>
        )}
        <Lista titulo="Campeonatos" itens={andamento} onAbrir={entrar} />
        <Lista titulo="Encerrados" itens={encerrados} onAbrir={entrar} />
      </div>
    </PwaLayout>
  );
}

function Lista({ titulo, itens, onAbrir }: { titulo: string; itens: TorneioResumo[]; onAbrir: (t: TorneioResumo) => void }) {
  if (itens.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-cinza">{titulo}</h2>
      {itens.map((t) => (
        <button
          key={t.id}
          onClick={() => onAbrir(t)}
          className="w-full text-left flex items-center gap-3 rounded-2xl bg-cartao border border-borda p-3 hover:border-destaque"
        >
          <Escudo nome={t.nome} url={t.logo_url} tamanho={48} />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold truncate">{t.nome}</span>
            <span className="block text-xs text-cinza truncate">
              {[t.esporte?.nome, FORMATOS_EVENTO.find((f) => f.valor === t.formato)?.rotulo, `${t.qtd_equipes} equipes`]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
          <span className={`text-[10px] font-semibold shrink-0 ${t.status === "em_andamento" ? "text-destaque" : "text-cinza"}`}>
            {STATUS[t.status] ?? ""}
          </span>
        </button>
      ))}
    </section>
  );
}
