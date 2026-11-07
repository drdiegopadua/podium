import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Empresa, Esporte, Evento } from "@arena/shared";
import { supabase } from "./supabaseClient";

const CHAVE = "arena.torneio";

export interface TorneioCompleto extends Evento {
  empresa: Pick<Empresa, "id" | "nome" | "logo_url" | "cor_primaria" | "cor_secundaria"> | null;
  esporte: Pick<Esporte, "id" | "nome"> | null;
}

interface TorneioValor {
  torneio: TorneioCompleto | null;
  carregando: boolean;
  erro: string | null;
  abrir: (codigo: string) => Promise<boolean>;
  esquecer: () => void;
}

const TorneioContext = createContext<TorneioValor | null>(null);

export function TorneioProvider({ children }: { children: ReactNode }) {
  const [torneio, setTorneio] = useState<TorneioCompleto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const abrir = useCallback(async (codigo: string) => {
    const limpo = codigo.trim().toUpperCase();
    if (!limpo) return false;
    setCarregando(true);
    setErro(null);
    const { data, error } = await supabase
      .from("eventos")
      .select(
        "*, empresa:empresas(id, nome, logo_url, cor_primaria, cor_secundaria), esporte:esportes(id, nome)"
      )
      .eq("codigo_evento", limpo)
      .maybeSingle();
    setCarregando(false);
    if (error || !data) {
      setErro("Torneio não encontrado. Confira o código.");
      return false;
    }
    setTorneio(data as TorneioCompleto);
    salvar(limpo);
    return true;
  }, []);

  useEffect(() => {
    const salvo = ler();
    if (salvo) abrir(salvo);
    else setCarregando(false);
  }, [abrir]);

  function esquecer() {
    setTorneio(null);
    salvar(null);
  }

  // A cor de destaque da empresa organizadora vira o acento do tema escuro
  useEffect(() => {
    const destaque = torneio?.empresa?.cor_secundaria ?? "#D4FF3A";
    document.documentElement.style.setProperty("--cor-destaque", destaque);
    document.title = torneio ? `${torneio.nome} · Arena Sports` : "Arena Sports";
  }, [torneio]);

  return (
    <TorneioContext.Provider value={{ torneio, carregando, erro, abrir, esquecer }}>
      {children}
    </TorneioContext.Provider>
  );
}

export function useTorneio() {
  const valor = useContext(TorneioContext);
  if (!valor) throw new Error("useTorneio precisa estar dentro de TorneioProvider");
  return valor;
}

function ler() {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

function salvar(codigo: string | null) {
  try {
    if (codigo) localStorage.setItem(CHAVE, codigo);
    else localStorage.removeItem(CHAVE);
  } catch {
    /* armazenamento indisponivel */
  }
}
