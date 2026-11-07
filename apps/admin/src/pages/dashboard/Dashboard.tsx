import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { supabase } from "../../lib/supabaseClient";
import { URL_PWA, linkTorneioNoApp } from "../../lib/config";
import { useSessao } from "../../contexts/SessaoContext";
import { useEventosDaEmpresa } from "../../components/SeletorEvento";

export function Dashboard() {
  const { empresaAtual, perfil } = useSessao();
  const { eventos } = useEventosDaEmpresa();
  const [contagem, setContagem] = useState({ equipes: 0, jogos: 0, sumulas: 0 });

  useEffect(() => {
    const ids = eventos.map((e) => e.id);
    if (ids.length === 0) {
      setContagem({ equipes: 0, jogos: 0, sumulas: 0 });
      return;
    }
    Promise.all([
      supabase.from("equipes").select("id", { count: "exact", head: true }).in("evento_id", ids),
      supabase
        .from("jogos")
        .select("id", { count: "exact", head: true })
        .in("evento_id", ids)
        .eq("status", "agendado"),
      supabase
        .from("jogos")
        .select("id", { count: "exact", head: true })
        .in("evento_id", ids)
        .eq("status", "em_andamento"),
    ]).then(([eq, jg, sm]) =>
      setContagem({ equipes: eq.count ?? 0, jogos: jg.count ?? 0, sumulas: sm.count ?? 0 })
    );
  }, [eventos]);

  const ativos = eventos.filter((e) => e.status !== "encerrado").length;
  const cartoes = [
    { titulo: "Torneios ativos", valor: ativos, href: "/eventos" },
    { titulo: "Equipes cadastradas", valor: contagem.equipes, href: "/equipes" },
    { titulo: "Jogos agendados", valor: contagem.jogos, href: "/jogos-agenda" },
    { titulo: "Jogos em andamento", valor: contagem.sumulas, href: "/sumulas" },
  ];

  return (
    <Layout>
      <PageHeader
        title={`Olá${perfil?.nome ? `, ${perfil.nome.split(" ")[0]}` : ""}!`}
        subtitle={`Visão geral dos torneios de ${empresaAtual?.nome ?? "sua empresa"}`}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cartoes.map((c) => (
          <Link
            key={c.titulo}
            to={c.href}
            className="bg-cartao rounded-2xl shadow-sm border border-borda p-5 hover:shadow-md transition-shadow"
          >
            <div className="text-sm text-cinza">{c.titulo}</div>
            <div className="text-3xl font-bold text-white mt-2">{c.valor}</div>
          </Link>
        ))}
      </div>
      <Link
        to="/eventos/criar"
        className="inline-block rounded-full bg-destaque text-preto font-semibold px-5 py-2.5 text-sm hover:brightness-95"
      >
        + Criar novo torneio
      </Link>

      <section className="mt-8 max-w-3xl bg-cartao rounded-2xl border border-borda p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-white">📱 App dos torcedores e atletas</h2>
            <p className="text-sm text-cinza mt-1">
              Divulgue o link. Quem abrir pode instalar o app no celular e acompanhar jogos e classificação.
            </p>
          </div>
          <a
            href={URL_PWA}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-cartao-2 border border-borda px-4 py-2 text-sm font-semibold hover:border-destaque"
          >
            Abrir app ↗
          </a>
        </div>
        <LinhaLink rotulo="Link do app" url={URL_PWA} />
        {empresaAtual?.slug && (
          <LinhaLink rotulo="Sua página de organizador (todos os campeonatos)" url={`${URL_PWA}/o/${empresaAtual.slug}`} />
        )}
        {eventos.slice(0, 5).map((e) => (
          <LinhaLink key={e.id} rotulo={e.nome} url={linkTorneioNoApp(e.codigo_evento)} />
        ))}
        {eventos.length > 0 && (
          <p className="text-xs text-cinza mt-3">
            O link de cada torneio abre o app direto nele, sem precisar digitar o código.
          </p>
        )}
      </section>
    </Layout>
  );
}

function LinhaLink({ rotulo, url }: { rotulo: string; url: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }
  return (
    <div className="mt-4 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-cinza truncate">{rotulo}</div>
        <a href={url} target="_blank" rel="noreferrer" className="block text-sm text-destaque truncate hover:underline">
          {url.replace(/^https?:\/\//, "")}
        </a>
      </div>
      <button
        type="button"
        onClick={copiar}
        className="shrink-0 rounded-full border border-borda px-3 py-1.5 text-xs font-semibold hover:border-destaque"
      >
        {copiado ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
