import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { FORMATOS_EVENTO } from "@arena/shared";
import { PwaLayout } from "../components/PwaLayout";
import { Escudo } from "../components/Escudo";
import { EntrarTorneio } from "../components/EntrarTorneio";
import { useTorneio, type TorneioCompleto } from "../lib/torneio";
import { dataHoraCurta, useJogos, type JogoComEquipes } from "../lib/useJogos";
import {
  IconeCalendario,
  IconeCheck,
  IconeFogo,
  IconePessoas,
  IconeSeta,
  IconeSino,
} from "../components/Icones";

export function Home() {
  const { torneio, carregando } = useTorneio();

  if (carregando) {
    return (
      <PwaLayout>
        <p className="pt-24 text-center text-sm text-cinza">Carregando...</p>
      </PwaLayout>
    );
  }

  return <PwaLayout>{torneio ? <PainelTorneio torneio={torneio} /> : <BoasVindas />}</PwaLayout>;
}

/* ---------- Sem torneio: tela de entrada ---------- */
function BoasVindas() {
  return (
    <div className="px-5 pt-10 space-y-8">
      <div className="text-sm font-bold tracking-wide">
        <span className="text-destaque">ARENA</span> SPORTS
      </div>
      <div>
        <h1 className="font-display text-5xl font-bold uppercase leading-[1.05]">
          Acompanhe
          <br />
          <span className="text-destaque">seu torneio</span>
          <br />
          ao vivo
        </h1>
        <p className="mt-4 text-sm text-cinza">
          Jogos, placares e classificação
          <br />
          na palma da mão.
        </p>
      </div>
      <EntrarTorneio />
    </div>
  );
}

/* ---------- Com torneio ---------- */
function PainelTorneio({ torneio }: { torneio: TorneioCompleto }) {
  const { jogos, aoVivo, proximos, encerrados } = useJogos(torneio.id);
  const [qtdEquipes, setQtdEquipes] = useState<number | null>(null);
  useEffect(() => {
    supabase
      .from("equipes")
      .select("id", { count: "exact", head: true })
      .eq("evento_id", torneio.id)
      .then(({ count }) => setQtdEquipes(count ?? 0));
  }, [torneio.id]);
  const total = jogos.length;
  const concluidos = encerrados.length;
  const pct = total ? Math.round((concluidos / total) * 100) : 0;
  const destaques = [...aoVivo, ...proximos].slice(0, 4);
  const formato = FORMATOS_EVENTO.find((f) => f.valor === torneio.formato)?.rotulo;
  const logo = torneio.logo_url ?? torneio.empresa?.logo_url;

  return (
    <div className="pt-6 space-y-7">
      <header className="px-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-cinza">
            {logo && <img src={logo} alt="" className="w-5 h-5 rounded-full object-cover bg-cartao" />}
            <span className="truncate">{torneio.empresa?.nome}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-tight">{torneio.nome}</h1>
          <p className="mt-1 text-sm text-cinza">
            {torneio.esporte?.nome} · {formato}
          </p>
        </div>
        <Link
          to="/evento"
          aria-label="Informações do torneio"
          className="shrink-0 w-11 h-11 rounded-full bg-cartao border border-borda flex items-center justify-center"
        >
          <IconeSino tamanho={18} />
        </Link>
      </header>

      <section>
        {destaques.length === 0 ? (
          <div className="mx-5 rounded-3xl bg-destaque text-preto p-6">
            <div className="text-xs font-medium opacity-70">Tabela de jogos</div>
            <div className="mt-1 text-2xl font-bold leading-tight">Em breve!</div>
            <p className="mt-2 text-sm opacity-80">O organizador ainda não divulgou os confrontos.</p>
            <Link
              to="/evento"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-preto text-white px-5 py-3 text-sm font-semibold"
            >
              Ver regulamento <IconeSeta tamanho={16} />
            </Link>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-5 pb-1 [scrollbar-width:none]">
            {destaques.map((j, i) => (
              <CartaoJogo key={j.id} jogo={j} principal={i === 0} />
            ))}
          </div>
        )}
      </section>

      <section className="px-5">
        <div className="rounded-3xl bg-cartao border border-borda p-5">
          <h2 className="text-sm font-semibold">Progresso do torneio</h2>
          <Medidor pct={pct} />
          <div className="grid grid-cols-3 divide-x divide-borda text-center">
            <Estat Icone={IconeCalendario} rotulo="Jogos" valor={total} sub={`${concluidos} realizados`} />
            <Estat Icone={IconePessoas} rotulo="Equipes" valor={qtdEquipes ?? 0} sub={`de ${torneio.qtd_equipes} vagas`} />
            <Estat Icone={IconeFogo} rotulo="Ao vivo" valor={aoVivo.length} sub="agora" />
          </div>
        </div>
      </section>

      <section className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Resultados recentes</h2>
          <Link to="/jogos" className="text-xs font-semibold text-destaque">
            Ver todos
          </Link>
        </div>
        {encerrados.length === 0 ? (
          <p className="rounded-2xl bg-cartao border border-borda p-4 text-sm text-cinza">
            Nenhum jogo encerrado ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {encerrados.slice(0, 4).map((j) => (
              <li key={j.id}>
                <Link
                  to={`/jogo/${j.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-cartao border border-borda p-3"
                >
                  <div className="relative w-12 h-11 shrink-0">
                    <Escudo nome={j.equipe_a?.nome} url={j.equipe_a?.logo_url} tamanho={30} className="absolute left-0 top-0" />
                    <Escudo nome={j.equipe_b?.nome} url={j.equipe_b?.logo_url} tamanho={30} className="absolute right-0 bottom-0 ring-2 ring-cartao" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">
                      {j.equipe_a?.nome ?? "?"} {j.placar_a ?? 0} × {j.placar_b ?? 0} {j.equipe_b?.nome ?? "?"}
                    </div>
                    <div className="text-xs text-cinza truncate">
                      {[j.fase, j.local].filter(Boolean).join(" · ") || (j.status === "wo" ? "W.O." : "Encerrado")}
                    </div>
                  </div>
                  <span className="w-7 h-7 shrink-0 rounded-full bg-destaque text-preto flex items-center justify-center">
                    <IconeCheck tamanho={14} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CartaoJogo({ jogo, principal }: { jogo: JogoComEquipes; principal: boolean }) {
  const aoVivo = jogo.status === "em_andamento";
  const cor = principal ? "bg-destaque text-preto" : "bg-cartao border border-borda text-white";
  return (
    <Link to={`/jogo/${jogo.id}`} className={`snap-start shrink-0 w-[78%] rounded-3xl p-5 flex flex-col ${cor}`}>
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="opacity-70">{jogo.fase ?? "Próximo jogo"}</span>
        {aoVivo ? (
          <span
            className={`rounded-full px-2 py-0.5 font-bold ${
              principal ? "bg-preto text-destaque" : "bg-ps-vermelho text-white"
            }`}
          >
            AO VIVO
          </span>
        ) : (
          <span className="opacity-70">{dataHoraCurta(jogo.data_hora)}</span>
        )}
      </div>
      <div className="mt-4 space-y-2">
        <LinhaPlacar nome={jogo.equipe_a?.nome} url={jogo.equipe_a?.logo_url} placar={aoVivo ? jogo.placar_a : null} />
        <LinhaPlacar nome={jogo.equipe_b?.nome} url={jogo.equipe_b?.logo_url} placar={aoVivo ? jogo.placar_b : null} />
      </div>
      {jogo.local && <div className="mt-3 text-xs opacity-70">{jogo.local}</div>}
      <span
        className={`mt-5 inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${
          principal ? "bg-preto text-white" : "bg-cartao-2 text-white"
        }`}
      >
        {aoVivo ? "Acompanhar" : "Ver detalhes"} <IconeSeta tamanho={16} />
      </span>
    </Link>
  );
}

function LinhaPlacar({ nome, url, placar }: { nome?: string; url?: string | null; placar?: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2.5 min-w-0">
        <Escudo nome={nome} url={url} tamanho={34} />
        <span className="text-lg font-bold leading-tight truncate">{nome ?? "A definir"}</span>
      </span>
      {placar != null && <span className="text-2xl font-extrabold tabular-nums">{placar}</span>}
    </div>
  );
}

function Medidor({ pct }: { pct: number }) {
  // Semicírculo de raio 80: comprimento do arco = π·r
  const arco = Math.PI * 80;
  return (
    <div className="relative mx-auto mt-3 mb-5 w-52">
      <svg viewBox="0 0 200 110" className="w-full">
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#2E2E33" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--cor-destaque)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={arco}
          strokeDashoffset={arco * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset .8s ease" }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="text-4xl font-extrabold tabular-nums">
          {pct}
          <span className="text-xl">%</span>
        </div>
        <div className="text-xs text-cinza">concluído</div>
      </div>
    </div>
  );
}

function Estat({
  Icone,
  rotulo,
  valor,
  sub,
}: {
  Icone: (p: { tamanho?: number }) => JSX.Element;
  rotulo: string;
  valor: number;
  sub: string;
}) {
  return (
    <div className="px-1 flex flex-col items-center gap-1">
      <span className="text-destaque">
        <Icone tamanho={18} />
      </span>
      <span className="text-[11px] text-cinza">{rotulo}</span>
      <span className="text-lg font-bold tabular-nums">{valor}</span>
      <span className="text-[10px] text-cinza">{sub}</span>
    </div>
  );
}
