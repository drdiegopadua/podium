import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { PageHeader } from "../../components/PageHeader";
import { supabase } from "../../lib/supabaseClient";
import type { Evento } from "@podium/shared";

export function ListaEventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase
      .from("eventos")
      .select("*")
      .order("criado_em", { ascending: false })
      .then(({ data }) => {
        setEventos((data as Evento[]) ?? []);
        setCarregando(false);
      });
  }, []);

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <PageHeader title="Eventos" subtitle="Campeonatos criados na plataforma" />
        <Link
          to="/eventos/criar"
          className="rounded-lg bg-ps-dourado text-ps-azul-escuro font-semibold px-4 py-2 text-sm h-fit hover:brightness-95"
        >
          + Criar evento
        </Link>
      </div>

      {carregando && <p className="text-sm text-slate-500">Carregando...</p>}

      {!carregando && eventos.length === 0 && (
        <p className="text-sm text-slate-500">Nenhum evento criado ainda.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {eventos.map((evento) => (
          <div key={evento.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div className="text-xs uppercase tracking-wide text-ps-dourado font-semibold">
              {evento.status.replace("_", " ")}
            </div>
            <div className="text-lg font-bold text-ps-azul-escuro mt-1">{evento.nome}</div>
            <div className="text-sm text-slate-500">{evento.cidade}</div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
