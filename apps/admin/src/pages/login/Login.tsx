import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useSessao } from "../../contexts/SessaoContext";

type Modo = "entrar" | "cadastrar" | "recuperar";

export function Login() {
  const navigate = useNavigate();
  const { sessao, carregando: carregandoSessao, recarregar } = useSessao();
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  if (!carregandoSessao && sessao) return <Navigate to="/" replace />;

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAviso(null);
    setCarregando(true);

    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw new Error(traduzirErro(error.message));
        navigate("/");
      } else if (modo === "cadastrar") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: { nome, empresa, telefone },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw new Error(traduzirErro(error.message));

        if (data.session) {
          // Sem confirmacao de e-mail: cria a empresa na hora.
          const { error: erroEmpresa } = await supabase.rpc("criar_empresa", {
            p_nome_empresa: empresa,
            p_nome_usuario: nome,
            p_telefone: telefone || null,
          });
          if (erroEmpresa) throw erroEmpresa;
          await recarregar();
          navigate("/");
        } else {
          setAviso("Conta criada! Confirme seu e-mail pelo link que enviamos e depois entre aqui.");
          setModo("entrar");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw new Error(traduzirErro(error.message));
        setAviso("Se o e-mail estiver cadastrado, você receberá um link para criar nova senha.");
        setModo("entrar");
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-fundo">
      <div className="hidden lg:flex flex-col justify-between p-12 text-white">
        <Marca />
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Crie e gerencie seus torneios <span className="text-destaque">em minutos.</span>
          </h1>
          <ul className="mt-8 space-y-3 text-cinza">
            <li>🏆 Qualquer esporte, formato e regra de pontuação</li>
            <li>📱 App PWA para torcedores, atletas e árbitros</li>
            <li>⚡ Placar, súmula e classificação em tempo real</li>
          </ul>
        </div>
        <p className="text-xs text-cinza">© {new Date().getFullYear()} Arena Sports</p>
      </div>

      <div className="flex items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="bg-cartao rounded-2xl shadow-xl w-full max-w-sm p-8 space-y-4"
        >
          <div className="text-center mb-2 lg:hidden">
            <Marca escura />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {modo === "entrar" && "Entrar no painel"}
              {modo === "cadastrar" && "Criar conta da empresa"}
              {modo === "recuperar" && "Recuperar senha"}
            </h2>
            {modo === "cadastrar" && (
              <p className="text-xs text-cinza mt-1">Comece grátis e crie seu primeiro torneio.</p>
            )}
          </div>

          {modo === "cadastrar" && (
            <>
              <Campo label="Seu nome">
                <input required value={nome} onChange={(e) => setNome(e.target.value)} className="input" />
              </Campo>
              <Campo label="Nome da empresa / organização">
                <input
                  required
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  placeholder="Ex.: Liga Esportiva Central"
                  className="input"
                />
              </Campo>
              <Campo label="Telefone (opcional)">
                <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="input" />
              </Campo>
            </>
          )}

          <Campo label="E-mail">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </Campo>

          {modo !== "recuperar" && (
            <Campo label="Senha">
              <input
                type="password"
                required
                minLength={6}
                autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="input"
              />
            </Campo>
          )}

          {erro && <p className="text-sm text-ps-vermelho">{erro}</p>}
          {aviso && <p className="text-sm text-destaque">{aviso}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-full bg-destaque text-preto font-semibold py-2 text-sm hover:brightness-95 disabled:opacity-60"
          >
            {carregando
              ? "Aguarde..."
              : modo === "entrar"
                ? "Entrar"
                : modo === "cadastrar"
                  ? "Criar conta"
                  : "Enviar link"}
          </button>

          <div className="text-xs text-center space-y-1 text-white/80">
            {modo === "entrar" ? (
              <>
                <button type="button" onClick={() => setModo("cadastrar")} className="underline block w-full">
                  Ainda não tem conta? Cadastre sua empresa
                </button>
                <button type="button" onClick={() => setModo("recuperar")} className="underline block w-full">
                  Esqueci minha senha
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setModo("entrar")} className="underline">
                Já tenho conta — entrar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Marca({ escura = false }: { escura?: boolean }) {
  return (
    <div>
      <div className={`text-2xl font-bold tracking-wide ${escura ? "text-white" : "text-white"}`}>
        <span className="text-destaque">ARENA</span> SPORTS
      </div>
      <p className={`text-xs mt-1 ${escura ? "text-cinza" : "text-cinza"}`}>Painel do organizador</p>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-white/80 mb-1">{label}</span>
      {children}
    </label>
  );
}

function traduzirErro(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail antes de entrar.";
  if (/already registered/i.test(msg)) return "Este e-mail já tem cadastro. Use \"Entrar\".";
  if (/password should be at least/i.test(msg)) return "A senha precisa ter pelo menos 6 caracteres.";
  return msg;
}
