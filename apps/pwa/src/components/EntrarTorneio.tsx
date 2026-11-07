import { FormEvent, useState } from "react";
import { useTorneio } from "../lib/torneio";

export function EntrarTorneio() {
  const { abrir, erro, carregando } = useTorneio();
  const [codigo, setCodigo] = useState("");

  async function enviar(e: FormEvent) {
    e.preventDefault();
    await abrir(codigo);
  }

  return (
    <form onSubmit={enviar} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-3">
      <div>
        <h2 className="font-bold text-ps-azul-escuro">Acompanhe um torneio</h2>
        <p className="text-xs text-slate-500 mt-1">
          Digite o código do torneio ou escaneie o QR Code divulgado pelo organizador.
        </p>
      </div>
      <input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
        placeholder="Ex.: 3F9A1C2B"
        className="input font-mono tracking-widest text-center uppercase"
        maxLength={12}
        required
      />
      {erro && <p className="text-sm text-ps-vermelho">{erro}</p>}
      <button
        disabled={carregando}
        className="w-full rounded-lg bg-destaque text-primaria font-semibold py-2 text-sm disabled:opacity-60"
      >
        {carregando ? "Buscando..." : "Abrir torneio"}
      </button>
    </form>
  );
}
