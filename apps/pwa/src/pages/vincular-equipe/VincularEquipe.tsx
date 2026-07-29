import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export function VincularEquipe() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const { data: usuario } = await supabase.auth.getUser();
      const perfilId = usuario.user?.id;
      if (!perfilId) throw new Error("Sessao expirada, faca login novamente.");

      const { data: equipe, error: erroEquipe } = await supabase
        .from("equipes")
        .select("id, nome")
        .eq("codigo_exclusivo", codigo.trim().toUpperCase())
        .single();

      if (erroEquipe || !equipe) throw new Error("Codigo invalido.");

      const { error: erroVinculo } = await supabase.from("atletas").insert({
        perfil_id: perfilId,
        equipe_id: equipe.id,
        aprovado: false,
      });

      if (erroVinculo) throw erroVinculo;

      navigate("/perfil");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao vincular equipe.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen bg-ps-azul-escuro flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
        <div className="text-center">
          <div className="text-xl font-bold text-ps-azul-escuro">Vincular a equipe</div>
          <p className="text-xs text-slate-500 mt-1">
            Peca o codigo exclusivo ao capitao da sua equipe
          </p>
        </div>

        <input
          required
          placeholder="Codigo da equipe (ex: EQP-A1B2C3D4)"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          className="input uppercase"
        />

        {erro && <p className="text-sm text-ps-vermelho">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-lg bg-ps-dourado text-ps-azul-escuro font-semibold py-2.5 text-sm hover:brightness-95 disabled:opacity-60"
        >
          {carregando ? "Vinculando..." : "Vincular"}
        </button>
        <p className="text-xs text-slate-400 text-center">
          Seu vinculo ficara pendente ate aprovacao do capitao ou gestor.
        </p>
      </form>
    </div>
  );
}
