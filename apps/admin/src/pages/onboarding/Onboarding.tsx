import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useSessao } from "../../contexts/SessaoContext";

export function Onboarding() {
  const navigate = useNavigate();
  const { sessao, perfil, empresaAtual, recarregar, sair } = useSessao();
  const [empresa, setEmpresa] = useState("");
  const [nome, setNome] = useState(perfil?.nome ?? (sessao?.user.user_metadata?.nome as string) ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (empresaAtual) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const { error } = await supabase.rpc("criar_empresa", {
      p_nome_empresa: empresa,
      p_nome_usuario: nome,
      p_telefone: null,
    });
    if (error) {
      setErro(error.message);
      setSalvando(false);
      return;
    }
    await recarregar();
    navigate("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-fundo p-4">
      <form onSubmit={handleSubmit} className="bg-cartao rounded-2xl shadow-xl w-full max-w-md p-8 space-y-4">
        <div>
          <h1 className="text-lg font-bold text-white">Cadastre sua empresa</h1>
          <p className="text-sm text-cinza mt-1">
            Sua conta ainda não está ligada a nenhuma empresa. Crie a sua agora — ou peça ao
            responsável para te adicionar à equipe dele.
          </p>
        </div>
        <label className="block">
          <span className="block text-sm font-medium text-white/80 mb-1">Seu nome</span>
          <input required value={nome} onChange={(e) => setNome(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-white/80 mb-1">Nome da empresa / organização</span>
          <input required value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="input" />
        </label>
        {erro && <p className="text-sm text-ps-vermelho">{erro}</p>}
        <div className="flex items-center justify-between">
          <button type="button" onClick={sair} className="text-xs underline text-cinza">
            Sair
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="rounded-full bg-destaque text-preto font-semibold px-5 py-2 text-sm disabled:opacity-60"
          >
            {salvando ? "Criando..." : "Criar empresa"}
          </button>
        </div>
      </form>
    </div>
  );
}
