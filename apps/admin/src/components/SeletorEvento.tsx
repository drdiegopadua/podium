import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Evento } from "@podium/shared";

export function useEventoSelecionado() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoId, setEventoId] = useState<string>("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase
      .from("eventos")
      .select("*")
      .order("criado_em", { ascending: false })
      .then(({ data }) => {
        const lista = (data as Evento[]) ?? [];
        setEventos(lista);
        setEventoId((atual) => atual || lista[0]?.id || "");
        setCarregando(false);
      });
  }, []);

  return { eventos, eventoId, setEventoId, carregando };
}

export function SeletorEvento({
  eventos,
  eventoId,
  onChange,
}: {
  eventos: Evento[];
  eventoId: string;
  onChange: (id: string) => void;
}) {
  if (eventos.length === 0) {
    return <p className="text-sm text-slate-500">Nenhum evento criado ainda.</p>;
  }

  return (
    <select value={eventoId} onChange={(e) => onChange(e.target.value)} className="input max-w-xs">
      {eventos.map((evento) => (
        <option key={evento.id} value={evento.id}>
          {evento.nome}
        </option>
      ))}
    </select>
  );
}
