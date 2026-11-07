import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Jogo } from "@arena/shared";
import { PwaLayout } from "../../components/PwaLayout";
import { EntrarTorneio } from "../../components/EntrarTorneio";
import { supabase } from "../../lib/supabaseClient";
import { useTorneio } from "../../lib/torneio";

interface JogoComEquipes extends Jogo {
  equipe_a: { nome: string; logo_url?: string | null } | null;
  equipe_b: { nome: string; logo_url?: string | null } | null;
}

const STATUS: Record<string, string> = {
  agendado: "Agendado",
  em_andamento: "AO VIVO",
  encerrado: "Encerrado",
  wo: "W.O.",
};

export function Jogos() {
  const { torneio } = useTorneio();
  const [jogos, setJogos] = useState<JogoComEquipes[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!torneio) return;
    const carregar = () =>
      supabase
        .from("jogos")
        .select(
          "*, equipe_a:equipes!jogos_equipe_a_id_fkey(nome, logo_url), equipe_b:equipes!jogos_equipe_b_id_fkey(nome, logo_url)"
        )
        .eq("evento_id", torneio.id)
        .order("data_hora", { ascending: true, nullsFirst: false })
        .then(({ data }) => {
          setJogos((data as JogoComEquipes[]) ?? []);
          setCarregando(false);
        });

    carregar();

    // Placar em tempo real
    const canal = supabase
      .channel(`jogos-${torneio.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jogos", filter: `evento_id=eq.${torneio.id}` },
        () => carregar()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [torneio]);

  if (!torneio) {
    return (
      <PwaLayout>
        <div className="p-5">
          <EntrarTorneio />
        </div>
      </PwaLayout>
    );
  }

  const aoVivo = jogos.filter((j) => j.status === "em_andamento");
  const proximos = jogos.filter((j) => j.status === "agendado");
  const encerrados = jogos.filter((j) => j.status === "encerrado" || j.status === "wo").reverse();

  return (
    <PwaLayout>
      <div className="p-5 space-y-5">
        <h1 className="text-lg font-bold text-primaria">Jogos</h1>
        {carregando && <p className="text-sm text-slate-500">Carregando...</p>}
        {!carregando && jogos.length === 0 && (
          <p className="text-sm text-slate-500">A tabela de jogos ainda não foi divulgada.</p>
        )}
        <Grupo titulo="Ao vivo" jogos={aoVivo} />
        <Grupo titulo="Próximos" jogos={proximos} />
        <Grupo titulo="Resultados" jogos={encerrados} />
      </div>
    </PwaLayout>
  );
}

function Grupo({ titulo, jogos }: { titulo: string; jogos: JogoComEquipes[] }) {
  if (jogos.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</h2>
      {jogos.map((j) => (
        <Link key={j.id} to={`/sumula/${j.id}`} className="block bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>
              {j.fase ?? ""}
              {j.local ? ` · ${j.local}` : ""}
            </span>
            <span className={j.status === "em_andamento" ? "text-ps-vermelho font-bold" : ""}>
              {j.status === "agendado" && j.data_hora
                ? new Date(j.data_hora).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : STATUS[j.status]}
            </span>
          </div>
          <Linha nome={j.equipe_a?.nome} placar={j.placar_a} mostrar={j.status !== "agendado"} />
          <Linha nome={j.equipe_b?.nome} placar={j.placar_b} mostrar={j.status !== "agendado"} />
        </Link>
      ))}
    </section>
  );
}

function Linha({ nome, placar, mostrar }: { nome?: string; placar?: number | null; mostrar: boolean }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-sm font-medium text-slate-800">{nome ?? "A definir"}</span>
      {mostrar && <span className="text-lg font-bold text-primaria">{placar ?? 0}</span>}
    </div>
  );
}
