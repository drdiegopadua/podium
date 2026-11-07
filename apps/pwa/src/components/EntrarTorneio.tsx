import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useTorneio } from "../lib/torneio";
import { Escudo } from "./Escudo";

interface ResultadoTorneio {
  id: string;
  nome: string;
  cidade: string;
  logo_url: string | null;
  codigo_evento: string;
  empresa: { nome: string } | null;
}
interface ResultadoOrganizador {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
}

const PARECE_CODIGO = /^[A-F0-9]{8}$/i;

/** Busca por nome do torneio ou do organizador, ou abre direto pelo codigo. */
export function EntrarTorneio() {
  const navigate = useNavigate();
  const { abrir, carregando } = useTorneio();
  const [termo, setTermo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [torneios, setTorneios] = useState<ResultadoTorneio[]>([]);
  const [organizadores, setOrganizadores] = useState<ResultadoOrganizador[]>([]);
  const [buscou, setBuscou] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // busca enquanto digita (a partir de 3 letras)
  useEffect(() => {
    const t = termo.trim();
    setErro(null);
    if (t.length < 3 || PARECE_CODIGO.test(t)) {
      setTorneios([]);
      setOrganizadores([]);
      setBuscou(false);
      return;
    }
    const id = setTimeout(async () => {
      setBuscando(true);
      const padrao = `%${t.replace(/[%_,()]/g, " ")}%`;
      const [r1, r2] = await Promise.all([
        supabase
          .from("eventos")
          .select("id, nome, cidade, logo_url, codigo_evento, empresa:empresas(nome)")
          .neq("status", "rascunho")
          .or(`nome.ilike.${padrao},cidade.ilike.${padrao}`)
          .order("data_inicio", { ascending: false })
          .limit(8),
        supabase.from("empresas").select("id, nome, slug, logo_url").ilike("nome", padrao).limit(5),
      ]);
      setTorneios((r1.data as unknown as ResultadoTorneio[]) ?? []);
      setOrganizadores((r2.data as ResultadoOrganizador[]) ?? []);
      setBuscou(true);
      setBuscando(false);
    }, 350);
    return () => clearTimeout(id);
  }, [termo]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const t = termo.trim();
    if (PARECE_CODIGO.test(t)) {
      if (!(await abrir(t))) setErro("Nenhum torneio com esse código.");
      return;
    }
    if (torneios.length === 1) entrar(torneios[0]);
  }

  async function entrar(t: ResultadoTorneio) {
    if (await abrir(t.codigo_evento)) navigate("/");
  }

  const nada = buscou && !buscando && torneios.length === 0 && organizadores.length === 0;

  return (
    <div className="bg-cartao rounded-2xl border border-borda p-5 space-y-3">
      <form onSubmit={enviar} className="space-y-3">
        <div>
          <h2 className="font-bold text-white">Encontre seu campeonato</h2>
          <p className="text-xs text-cinza mt-1">Busque pelo nome do torneio, cidade ou organizador — ou digite o código.</p>
        </div>
        <div className="relative">
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Ex.: Copa do Bairro ou 3F9A1C2B"
            className="input pr-10"
            autoComplete="off"
            enterKeyHint="search"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-cinza">⌕</span>
        </div>
        {PARECE_CODIGO.test(termo.trim()) && (
          <button
            disabled={carregando}
            className="w-full rounded-full bg-destaque text-preto font-semibold py-3 text-sm disabled:opacity-60"
          >
            {carregando ? "Abrindo..." : "Abrir torneio pelo código"}
          </button>
        )}
      </form>

      {erro && <p className="text-sm text-ps-vermelho">{erro}</p>}
      {buscando && <p className="text-xs text-cinza">Buscando...</p>}
      {nada && <p className="text-sm text-cinza">Nada encontrado. Confira o nome ou peça o código ao organizador.</p>}

      {organizadores.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-[11px] uppercase tracking-wide text-cinza">Organizadores</div>
          {organizadores.map((o) => (
            <button
              key={o.id}
              onClick={() => navigate(`/o/${o.slug}`)}
              className="w-full flex items-center gap-3 rounded-xl bg-cartao-2 border border-borda p-2.5 text-left"
            >
              <Escudo nome={o.nome} url={o.logo_url} tamanho={36} />
              <span className="font-semibold text-sm truncate">{o.nome}</span>
              <span className="ml-auto text-cinza">›</span>
            </button>
          ))}
        </div>
      )}
      {torneios.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-[11px] uppercase tracking-wide text-cinza">Campeonatos</div>
          {torneios.map((t) => (
            <button
              key={t.id}
              onClick={() => entrar(t)}
              className="w-full flex items-center gap-3 rounded-xl bg-cartao-2 border border-borda p-2.5 text-left"
            >
              <Escudo nome={t.nome} url={t.logo_url} tamanho={36} />
              <span className="min-w-0">
                <span className="block font-semibold text-sm truncate">{t.nome}</span>
                <span className="block text-xs text-cinza truncate">
                  {[t.empresa?.nome, t.cidade].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="ml-auto text-cinza">›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
