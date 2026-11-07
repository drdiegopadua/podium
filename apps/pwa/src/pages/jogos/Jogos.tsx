import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PwaLayout } from "../../components/PwaLayout";
import { EntrarTorneio } from "../../components/EntrarTorneio";
import { useTorneio } from "../../lib/torneio";
import { dataHoraCurta, useJogos, type JogoComEquipes } from "../../lib/useJogos";

type Aba = "proximos" | "ao_vivo" | "resultados";

export function Jogos() {
  const { torneio } = useTorneio();
  const { aoVivo, proximos, encerrados, carregando } = useJogos(torneio?.id);
  const [aba, setAba] = useState<Aba>("proximos");

  // Se há jogo rolando, abre direto na aba "Ao vivo"
  useEffect(() => {
    if (!carregando && aoVivo.length > 0) setAba("ao_vivo");
  }, [carregando, aoVivo.length]);

  if (!torneio) {
    return (
      <PwaLayout>
        <div className="p-5 pt-10">
          <EntrarTorneio />
        </div>
      </PwaLayout>
    );
  }

  const lista = aba === "ao_vivo" ? aoVivo : aba === "proximos" ? proximos : encerrados;
  const abas: { id: Aba; rotulo: string; n: number }[] = [
    { id: "proximos", rotulo: "Próximos", n: proximos.length },
    { id: "ao_vivo", rotulo: "Ao vivo", n: aoVivo.length },
    { id: "resultados", rotulo: "Resultados", n: encerrados.length },
  ];

  return (
    <PwaLayout>
      <div className="px-5 pt-6 space-y-5">
        <h1 className="text-center text-lg font-semibold">Jogos</h1>

        <div className="flex rounded-full bg-cartao border border-borda p-1">
          {abas.map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
                aba === a.id ? "bg-destaque text-preto" : "text-cinza"
              }`}
            >
              {a.rotulo}
              {a.n > 0 && <span className="ml-1 opacity-60">{a.n}</span>}
            </button>
          ))}
        </div>

        {carregando && <p className="text-sm text-cinza">Carregando...</p>}
        {!carregando && lista.length === 0 && (
          <p className="rounded-2xl bg-cartao border border-borda p-4 text-sm text-cinza">
            {aba === "ao_vivo" ? "Nenhum jogo acontecendo agora." : "Nenhum jogo por aqui ainda."}
          </p>
        )}

        <div className="space-y-3">
          {lista.map((j) => (
            <CartaoJogo key={j.id} jogo={j} />
          ))}
        </div>
      </div>
    </PwaLayout>
  );
}

function CartaoJogo({ jogo }: { jogo: JogoComEquipes }) {
  const aoVivo = jogo.status === "em_andamento";
  const mostrar = jogo.status !== "agendado";
  return (
    <Link
      to={`/sumula/${jogo.id}`}
      className={`block rounded-2xl p-4 border bg-cartao ${aoVivo ? "border-destaque" : "border-borda"}`}
    >
      <div className="flex justify-between gap-3 text-xs text-cinza mb-3">
        <span className="truncate">{[jogo.fase, jogo.local].filter(Boolean).join(" · ")}</span>
        {aoVivo ? (
          <span className="font-bold text-destaque">● AO VIVO</span>
        ) : jogo.status === "agendado" ? (
          <span className="shrink-0">{dataHoraCurta(jogo.data_hora)}</span>
        ) : (
          <span>{jogo.status === "wo" ? "W.O." : "Encerrado"}</span>
        )}
      </div>
      <Linha nome={jogo.equipe_a?.nome} placar={jogo.placar_a} mostrar={mostrar} venceu={venceu(jogo, "a")} />
      <Linha nome={jogo.equipe_b?.nome} placar={jogo.placar_b} mostrar={mostrar} venceu={venceu(jogo, "b")} />
    </Link>
  );
}

function venceu(j: JogoComEquipes, lado: "a" | "b") {
  if (j.status !== "encerrado" && j.status !== "wo") return false;
  const a = j.placar_a ?? 0;
  const b = j.placar_b ?? 0;
  return lado === "a" ? a > b : b > a;
}

function Linha({
  nome,
  placar,
  mostrar,
  venceu,
}: {
  nome?: string;
  placar?: number | null;
  mostrar: boolean;
  venceu: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className={`text-sm ${venceu ? "font-bold text-white" : "font-medium text-white/80"}`}>
        {nome ?? "A definir"}
      </span>
      {mostrar && (
        <span className={`text-xl font-extrabold tabular-nums ${venceu ? "text-destaque" : "text-white"}`}>
          {placar ?? 0}
        </span>
      )}
    </div>
  );
}
