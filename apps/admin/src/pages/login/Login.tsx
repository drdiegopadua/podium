import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    navigate("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ps-azul-escuro">
      <form
        onSubmit={handleSubmit}
        className="bg-ps-branco rounded-xl shadow-xl w-full max-w-sm p-8 space-y-4"
      >
        <div className="text-center mb-2">
          <div className="text-xl font-bold text-ps-azul-escuro">
            PADUA <span className="text-ps-dourado">SPORTS</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Painel Admin</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-ps-cinza px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ps-dourado"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-lg border border-ps-cinza px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ps-dourado"
          />
        </div>

        {erro && <p className="text-sm text-ps-vermelho">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-lg bg-ps-dourado text-ps-azul-escuro font-semibold py-2 text-sm hover:brightness-95 disabled:opacity-60"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
