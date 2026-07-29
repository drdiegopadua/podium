import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export function LoginCadastro() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password: senha });
        if (error) throw error;
        if (data.user) {
          await supabase.from("perfis").insert({
            id: data.user.id,
            nome,
            telefone,
            tipo: "atleta",
          });
        }
      }
      navigate("/vincular-equipe");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao autenticar.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen bg-ps-azul-escuro flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
        <div className="text-center">
          <div className="text-xl font-bold text-ps-azul-escuro">
            PADUA <span className="text-ps-dourado">SPORTS</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {modo === "login" ? "Entrar na sua conta" : "Criar conta"}
          </p>
        </div>

        {modo === "cadastro" && (
          <>
            <input
              required
              placeholder="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="input"
            />
            <input
              placeholder="Telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="input"
            />
          </>
        )}

        <input
          type="email"
          required
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
        <input
          type="password"
          required
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="input"
        />

        {erro && <p className="text-sm text-ps-vermelho">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-lg bg-ps-dourado text-ps-azul-escuro font-semibold py-2.5 text-sm hover:brightness-95 disabled:opacity-60"
        >
          {carregando ? "Aguarde..." : modo === "login" ? "Entrar" : "Cadastrar"}
        </button>

        <button
          type="button"
          onClick={() => setModo(modo === "login" ? "cadastro" : "login")}
          className="w-full text-xs text-ps-azul-marinho underline"
        >
          {modo === "login" ? "Nao tem conta? Cadastre-se" : "Ja tem conta? Entrar"}
        </button>
      </form>
    </div>
  );
}
