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
    <form onSubmit={enviar} className="bg-cartao rounded-2xl shadow-sm border border-borda p-5 space-y-3">
      <div>
        <h2 className="font-bold text-white">Acompanhe um torneio</h2>
        <p className="text-xs text-cinza mt-1">
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
        className="w-full rounded-full bg-destaque text-preto font-semibold py-3 text-sm disabled:opacity-60"
      >
        {carregando ? "Buscando..." : "Abrir torneio"}
      </button>
    </form>
  );
}
