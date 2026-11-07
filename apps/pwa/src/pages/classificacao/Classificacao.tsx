import { useEffect, useState } from "react";
import type { Classificacao as LinhaClassificacao } from "@arena/shared";
import { PwaLayout } from "../../components/PwaLayout";
import { EntrarTorneio } from "../../components/EntrarTorneio";
import { supabase } from "../../lib/supabaseClient";
import { useTorneio } from "../../lib/torneio";

interface Linha extends LinhaClassificacao {
  equipe: { nome: string } | null;
}

export function Classificacao() {
  const { torneio } = useTorneio();
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!torneio) return;
    const carregar = () =>
      supabase
        .from("classificacao")
        .select("*, equipe:equipes(nome)")
        .eq("evento_id", torneio.id)
        .order("grupo", { ascending: true })
        .order("pontos", { ascending: false })
        .order("vitorias", { ascending: false })
        .order("saldo", { ascending: false })
        .then(({ data }) => {
          setLinhas((data as Linha[]) ?? []);
          setCarregando(false);
        });

    carregar();
    const canal = supabase
      .channel(`classificacao-${torneio.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "classificacao", filter: `evento_id=eq.${torneio.id}` },
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

  const grupos = Array.from(new Set(linhas.map((l) => l.grupo ?? "")));

  return (
    <PwaLayout>
      <div className="p-5 space-y-5">
        <h1 className="text-lg font-bold text-white">Classificação</h1>
        {carregando && <p className="text-sm text-cinza">Carregando...</p>}
        {!carregando && linhas.length === 0 && (
          <p className="text-sm text-cinza">A classificação aparece após os primeiros jogos.</p>
        )}
        {grupos.map((g) => (
          <section key={g} className="bg-cartao rounded-2xl shadow-sm border border-borda overflow-hidden">
            {g && <h2 className="px-4 pt-3 text-xs font-semibold uppercase text-cinza">Grupo {g}</h2>}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-cinza">
                  <th className="text-left px-4 py-2 font-medium">Equipe</th>
                  <th className="px-2 font-medium">P</th>
                  <th className="px-2 font-medium">V</th>
                  <th className="px-2 font-medium">D</th>
                  <th className="px-2 pr-4 font-medium">S</th>
                </tr>
              </thead>
              <tbody>
                {linhas
                  .filter((l) => (l.grupo ?? "") === g)
                  .map((l, i) => (
                    <tr key={l.id} className="border-t border-borda">
                      <td className="px-4 py-2">
                        <span className="text-cinza mr-2">{i + 1}</span>
                        {l.equipe?.nome}
                      </td>
                      <td className="text-center font-bold text-white">{l.pontos}</td>
                      <td className="text-center">{l.vitorias}</td>
                      <td className="text-center">{l.derrotas}</td>
                      <td className="text-center pr-4">{l.saldo}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </PwaLayout>
  );
}
