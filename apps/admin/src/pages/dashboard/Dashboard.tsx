import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { supabase } from "../../lib/supabaseClient";
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
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow"
          >
            <div className="text-sm text-slate-500">{c.titulo}</div>
            <div className="text-3xl font-bold text-ps-azul-escuro mt-2">{c.valor}</div>
          </Link>
        ))}
      </div>
      <Link
        to="/eventos/criar"
        className="inline-block rounded-lg bg-ps-dourado text-ps-azul-escuro font-semibold px-5 py-2.5 text-sm hover:brightness-95"
      >
        + Criar novo torneio
      </Link>
    </Layout>
  );
}
