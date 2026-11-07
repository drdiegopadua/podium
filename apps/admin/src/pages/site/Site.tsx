import { useState } from "react";
import { Link } from "react-router-dom";
import { PLANOS, formatarPreco } from "@arena/shared";
import { URL_PWA } from "../../lib/config";

const RECURSOS = [
  { icone: "⚡", titulo: "Tabela gerada sozinha", texto: "Cadastre as equipes, escolha o formato e os confrontos ficam prontos: pontos corridos, grupos ou mata-mata." },
  { icone: "📊", titulo: "Classificação ao vivo", texto: "Lançou o placar, a tabela se atualiza com os seus critérios de desempate. O mata-mata avança sozinho." },
  { icone: "🥇", titulo: "Artilharia e cartões", texto: "Gols, assistências e cartões por jogador. Suspensos e pendurados calculados pela regra do torneio." },
  { icone: "📱", titulo: "App para a torcida", texto: "Jogos, placares e classificação no celular de atletas e torcedores — instala direto do navegador." },
  { icone: "🎨", titulo: "Artes para redes", texto: "Resultado, classificação, artilharia e próximos jogos em imagens prontas para Instagram e WhatsApp." },
  { icone: "📰", titulo: "Mural do campeonato", texto: "Notícias, fotos e vídeos de cada rodada no app, para todo mundo ficar por dentro." },
  { icone: "🤝", titulo: "Patrocinadores em destaque", texto: "Logos e links das marcas parceiras exibidos no app em todos os seus campeonatos." },
  { icone: "🖨", titulo: "Relatórios para imprimir", texto: "Tabela, classificação, súmula e elenco prontos para imprimir ou salvar em PDF." },
  { icone: "👥", titulo: "Equipe de organização", texto: "Convide gestores e árbitros. Cada um lança o que precisa, com acesso só à sua empresa." },
];

const ESPORTES = ["Futebol", "Futsal", "Society", "Vôlei", "Basquete", "Handebol", "Beach Tennis", "e muito mais"];

const DUVIDAS = [
  ["Preciso instalar alguma coisa?", "Não. O painel funciona no navegador do computador ou do celular, e o app da torcida pode ser instalado direto pelo link, sem loja de aplicativos."],
  ["Quais esportes posso usar?", "Futebol, futsal, vôlei, basquete, handebol, beach tennis e qualquer outro: você cria o esporte e escolhe as estatísticas."],
  ["Como os torcedores acompanham?", "Você divulga o link ou o QR Code do campeonato. Eles também encontram pela busca, pelo nome do torneio ou do organizador."],
  ["Posso começar de graça?", "Sim. O plano Grátis permite 1 campeonato ativo com até 12 equipes, sem cartão de crédito. Faça upgrade quando precisar."],
  ["Posso dividir o trabalho com outras pessoas?", "Sim. Convide gestores e árbitros pelo e-mail; cada um entra com o próprio login."],
];

export function Site() {
  const [anual, setAnual] = useState(false);

  return (
    <div className="min-h-screen bg-fundo text-white">
      {/* Navegacao */}
      <header className="sticky top-0 z-30 bg-fundo/90 backdrop-blur border-b border-borda">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a href="#inicio" className="text-lg font-bold tracking-wide whitespace-nowrap">
            <span className="text-destaque">ARENA</span> SPORTS
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm text-cinza">
            <a href="#recursos" className="hover:text-white">Recursos</a>
            <a href="#como-funciona" className="hover:text-white">Como funciona</a>
            <a href="#planos" className="hover:text-white">Planos</a>
            <a href="#duvidas" className="hover:text-white">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:inline text-sm font-semibold px-3 py-2">
              Entrar
            </Link>
            <Link to="/login?cadastro=1" className="rounded-full bg-destaque text-preto font-semibold px-4 py-2 text-sm whitespace-nowrap">
              Criar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="inicio" className="relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-destaque/10 blur-3xl" aria-hidden />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24 grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-center relative">
          <div>
            <div className="inline-block rounded-full border border-borda bg-cartao px-3 py-1 text-xs text-cinza mb-6">
              Gestão de campeonatos esportivos
            </div>
            <h1 className="font-display text-5xl sm:text-6xl font-bold uppercase leading-[1.02]">
              Do sorteio <br />
              à <span className="text-destaque">grande final</span>, <br />
              tudo no ar.
            </h1>
            <p className="mt-6 text-lg text-cinza max-w-xl">
              Crie o campeonato, cadastre as equipes e o Arena Sports cuida do resto: tabela, classificação, artilharia e um
              app para a torcida acompanhar ao vivo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login?cadastro=1" className="rounded-full bg-destaque text-preto font-semibold px-6 py-3.5">
                Criar campeonato grátis →
              </Link>
              <a href={URL_PWA} target="_blank" rel="noreferrer" className="rounded-full border border-borda px-6 py-3.5 font-semibold">
                Ver o app da torcida
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-cinza">
              <span>✓ Sem cartão de crédito</span>
              <span>✓ Pronto em 5 minutos</span>
              <span>✓ Qualquer esporte</span>
            </div>
          </div>
          <Celular />
        </div>
      </section>

      {/* Esportes */}
      <section className="border-y border-borda bg-cartao/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-cinza">
          {ESPORTES.map((e) => (
            <span key={e} className={e === "e muito mais" ? "text-destaque" : ""}>
              {e}
            </span>
          ))}
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <Titulo selo="Tudo em um lugar" titulo="Menos planilha e grupo de WhatsApp. Mais campeonato." />
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {RECURSOS.map((r) => (
            <div key={r.titulo} className="rounded-3xl bg-cartao border border-borda p-6">
              <div className="w-11 h-11 rounded-2xl bg-destaque/15 flex items-center justify-center text-xl">{r.icone}</div>
              <h3 className="mt-4 font-bold text-lg">{r.titulo}</h3>
              <p className="mt-1.5 text-sm text-cinza leading-relaxed">{r.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="bg-cartao/50 border-y border-borda">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <Titulo selo="Como funciona" titulo="Seu campeonato rodando em 3 passos" />
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              ["Crie o campeonato", "Escolha o esporte, o formato, as regras de pontuação e as datas. Envie o logo."],
              ["Cadastre as equipes", "Nome e escudo de cada equipe. Gere a tabela de jogos com um clique."],
              ["Lance e divulgue", "Lance os resultados; classificação, artilharia e o app se atualizam sozinhos."],
            ].map(([t, d], i) => (
              <div key={t} className="relative rounded-3xl border border-borda bg-fundo p-6">
                <div className="font-display text-6xl font-bold text-destaque/90">{i + 1}</div>
                <h3 className="mt-2 font-bold text-lg">{t}</h3>
                <p className="mt-1 text-sm text-cinza">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <Titulo selo="Planos" titulo="Comece grátis. Cresça no seu ritmo." />
        <div className="mt-8 flex justify-center">
          <div className="flex rounded-full bg-cartao border border-borda p-1 text-sm font-semibold">
            <button onClick={() => setAnual(false)} className={`rounded-full px-4 py-2 ${!anual ? "bg-destaque text-preto" : "text-cinza"}`}>
              Mensal
            </button>
            <button onClick={() => setAnual(true)} className={`rounded-full px-4 py-2 ${anual ? "bg-destaque text-preto" : "text-cinza"}`}>
              Anual −20%
            </button>
          </div>
        </div>
        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANOS.map((p) => {
            const preco = anual ? p.precoAnualMes : p.precoMensal;
            return (
              <div
                key={p.codigo}
                className={`rounded-3xl border p-6 flex flex-col ${p.destaque ? "border-destaque bg-destaque/5 lg:-translate-y-2" : "border-borda bg-cartao"}`}
              >
                {p.destaque && <div className="text-[11px] font-bold uppercase tracking-wide text-destaque mb-2">Mais escolhido</div>}
                <h3 className="font-bold text-xl">{p.nome}</h3>
                <p className="text-sm text-cinza mt-1 min-h-[40px]">{p.descricao}</p>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold">{formatarPreco(preco)}</span>
                  {preco ? <span className="text-cinza">/mês</span> : null}
                </div>
                <ul className="mt-5 space-y-2 text-sm flex-1">
                  {p.recursos.map((r) => (
                    <li key={r} className="flex gap-2">
                      <span className="text-destaque">✓</span>
                      <span className="text-white/85">{r}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login?cadastro=1"
                  className={`mt-6 text-center rounded-full py-3 font-semibold ${p.destaque ? "bg-destaque text-preto" : "border border-borda"}`}
                >
                  {p.codigo === "teste" ? "Começar grátis" : p.precoMensal == null ? "Falar com a gente" : "Começar agora"}
                </Link>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm text-cinza">Uma assinatura vale para todos os campeonatos da sua empresa. Cancele quando quiser.</p>
      </section>

      {/* Duvidas */}
      <section id="duvidas" className="bg-cartao/50 border-t border-borda">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
          <Titulo selo="Dúvidas" titulo="Perguntas frequentes" />
          <div className="mt-10 space-y-3">
            {DUVIDAS.map(([q, r]) => (
              <details key={q} className="group rounded-2xl border border-borda bg-fundo p-5">
                <summary className="cursor-pointer list-none flex justify-between gap-4 font-semibold">
                  {q}
                  <span className="text-destaque group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-cinza leading-relaxed">{r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="rounded-[2rem] bg-destaque text-preto p-10 md:p-14 text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold uppercase">Pronto para o apito inicial?</h2>
          <p className="mt-3 text-lg opacity-80">Crie seu primeiro campeonato agora. É grátis.</p>
          <Link to="/login?cadastro=1" className="mt-8 inline-block rounded-full bg-preto text-white font-semibold px-8 py-4">
            Criar campeonato grátis →
          </Link>
        </div>
      </section>

      <footer className="border-t border-borda">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-cinza">
          <span className="font-bold text-white">
            <span className="text-destaque">ARENA</span> SPORTS
          </span>
          <div className="flex gap-6">
            <a href={URL_PWA} target="_blank" rel="noreferrer" className="hover:text-white">
              App da torcida
            </a>
            <Link to="/login" className="hover:text-white">
              Entrar
            </Link>
          </div>
          <span>© {new Date().getFullYear()} Arena Sports</span>
        </div>
      </footer>
    </div>
  );
}

function Titulo({ selo, titulo }: { selo: string; titulo: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-destaque">{selo}</div>
      <h2 className="mt-3 text-3xl md:text-4xl font-bold leading-tight">{titulo}</h2>
    </div>
  );
}

/** Mock de celular com a tela do app (feito em HTML, sem imagens externas). */
function Celular() {
  const linhas = [
    ["Alvorada FC", 10, "+6"],
    ["União EC", 9, "+5"],
    ["Estrela", 7, "+3"],
    ["Real Oeste", 4, "-2"],
  ] as const;
  return (
    <div className="mx-auto w-[290px] rounded-[2.6rem] border-[10px] border-[#1d1d21] bg-fundo shadow-2xl shadow-black/60 overflow-hidden">
      <div className="px-4 pt-5 pb-6 space-y-4 text-[13px]">
        <div className="flex items-center justify-between text-[10px] text-cinza">
          <span>9:41</span>
          <span>●●● ▮</span>
        </div>
        <div>
          <div className="text-[10px] text-cinza">Liga Central</div>
          <div className="font-bold text-base leading-tight">Copa do Bairro 2026</div>
          <div className="text-[11px] text-cinza">Futebol · Grupos + mata-mata</div>
        </div>
        <div className="rounded-3xl bg-destaque text-preto p-4">
          <div className="flex justify-between text-[10px] font-semibold">
            <span className="opacity-70">Semifinal</span>
            <span className="rounded-full bg-preto text-destaque px-2">AO VIVO</span>
          </div>
          <div className="mt-3 space-y-1.5 font-bold">
            <div className="flex justify-between"><span>Alvorada FC</span><span className="text-lg">2</span></div>
            <div className="flex justify-between"><span>Estrela</span><span className="text-lg">1</span></div>
          </div>
          <div className="mt-3 inline-block rounded-full bg-preto text-white px-3 py-1.5 text-[11px] font-semibold">Acompanhar →</div>
        </div>
        <div className="rounded-2xl bg-cartao border border-borda p-3">
          <div className="text-[11px] font-semibold mb-2">Classificação · Grupo A</div>
          {linhas.map(([n, p, s], i) => (
            <div key={n} className="flex items-center gap-2 py-1 border-t border-borda first:border-0">
              <span className={`w-4 text-center text-[10px] rounded ${i < 2 ? "bg-destaque text-preto font-bold" : "text-cinza"}`}>{i + 1}</span>
              <span className="flex-1 truncate">{n}</span>
              <span className="text-cinza text-[11px] w-6 text-right">{s}</span>
              <span className="font-bold text-destaque w-5 text-right">{p}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-around text-[10px] text-cinza pt-1">
          <span className="text-destaque">Início</span>
          <span>Jogos</span>
          <span>Tabela</span>
          <span>Stats</span>
        </div>
      </div>
    </div>
  );
}
