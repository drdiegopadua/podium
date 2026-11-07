import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Empresa, PapelEmpresa, Perfil } from "@arena/shared";
import { supabase } from "../lib/supabaseClient";

const CHAVE_EMPRESA = "arena.empresaAtual";

export interface VinculoEmpresa {
  papel: PapelEmpresa;
  empresa: Empresa;
}

interface SessaoValor {
  carregando: boolean;
  sessao: Session | null;
  perfil: Perfil | null;
  vinculos: VinculoEmpresa[];
  empresaAtual: Empresa | null;
  papelAtual: PapelEmpresa | null;
  trocarEmpresa: (id: string) => void;
  recarregar: () => Promise<void>;
  sair: () => Promise<void>;
}

const SessaoContext = createContext<SessaoValor | null>(null);

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [sessao, setSessao] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [vinculos, setVinculos] = useState<VinculoEmpresa[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(() => lerEmpresaSalva());

  const carregarDados = useCallback(async (s: Session | null) => {
    if (!s) {
      setPerfil(null);
      setVinculos([]);
      return;
    }

    let lista = await buscarVinculos(s.user.id);

    // Conta criada com confirmacao de e-mail: a empresa informada no cadastro
    // fica nos metadados e eh criada no primeiro login.
    const meta = s.user.user_metadata ?? {};
    if (lista.length === 0 && typeof meta.empresa === "string" && meta.empresa.trim()) {
      const { error } = await supabase.rpc("criar_empresa", {
        p_nome_empresa: meta.empresa,
        p_nome_usuario: meta.nome ?? s.user.email ?? "Gestor",
        p_telefone: meta.telefone ?? null,
      });
      if (!error) lista = await buscarVinculos(s.user.id);
    }

    const { data: p } = await supabase.from("perfis").select("*").eq("id", s.user.id).maybeSingle();
    setPerfil((p as Perfil) ?? null);
    setVinculos(lista);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSessao(data.session);
      await carregarDados(data.session);
      setCarregando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((evento, novaSessao) => {
      setSessao(novaSessao);
      if (evento === "SIGNED_IN" || evento === "SIGNED_OUT") {
        setCarregando(true);
        // fora do callback para nao travar o cliente do Supabase
        setTimeout(() => carregarDados(novaSessao).finally(() => setCarregando(false)), 0);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [carregarDados]);

  const vinculoAtual = vinculos.find((v) => v.empresa.id === empresaId) ?? vinculos[0] ?? null;

  function trocarEmpresa(id: string) {
    setEmpresaId(id);
    try {
      localStorage.setItem(CHAVE_EMPRESA, id);
    } catch {
      /* armazenamento indisponivel */
    }
  }

  async function recarregar() {
    await carregarDados(sessao);
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  return (
    <SessaoContext.Provider
      value={{
        carregando,
        sessao,
        perfil,
        vinculos,
        empresaAtual: vinculoAtual?.empresa ?? null,
        papelAtual: vinculoAtual?.papel ?? null,
        trocarEmpresa,
        recarregar,
        sair,
      }}
    >
      {children}
    </SessaoContext.Provider>
  );
}

export function useSessao() {
  const valor = useContext(SessaoContext);
  if (!valor) throw new Error("useSessao precisa estar dentro de SessaoProvider");
  return valor;
}

async function buscarVinculos(perfilId: string): Promise<VinculoEmpresa[]> {
  const { data } = await supabase
    .from("membros_empresa")
    .select("papel, empresa:empresas(*)")
    .eq("perfil_id", perfilId);
  return ((data ?? []) as unknown as VinculoEmpresa[]).filter((v) => v.empresa);
}

function lerEmpresaSalva() {
  try {
    return localStorage.getItem(CHAVE_EMPRESA);
  } catch {
    return null;
  }
}
