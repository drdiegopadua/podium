import { Layout } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { Link } from "react-router-dom";

const cartoes = [
  { titulo: "Eventos ativos", valor: "-", href: "/eventos" },
  { titulo: "Equipes cadastradas", valor: "-", href: "/equipes" },
  { titulo: "Jogos agendados", valor: "-", href: "/jogos-agenda" },
  { titulo: "Sumulas abertas", valor: "-", href: "/sumulas" },
];

export function Dashboard() {
  return (
    <Layout>
      <PageHeader title="Dashboard" subtitle="Visao geral dos seus campeonatos" />
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
        + Criar novo evento
      </Link>
    </Layout>
  );
}
