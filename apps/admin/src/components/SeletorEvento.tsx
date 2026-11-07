import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useSessao } from "../contexts/SessaoContext";
import type { Evento } from "@arena/shared";

/** Torneios da empresa atual (o RLS deixa ler todos, entao filtramos por empresa aqui). */
export function useEventosDaEmpresa() {
  const { empresaAtual } = useSessao();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!empresaAtual) return;
    setCarregando(true);
    supabase
      .from("eventos")
      .select("*")
      .eq("empresa_id", empresaAtual.id)
      .order("criado_em", { ascending: false })
      .then(({ data }) => {
        setEventos((data as Evento[]) ?? []);
        setCarregando(false);
      });
  }, [empresaAtual]);

  return { eventos, carregando };
}

export function useEventoSelecionado() {
  const { eventos, carregando } = useEventosDaEmpresa();
  const [eventoId, setEventoId] = useState<string>("");

  useEffect(() => {
    setEventoId((atual) => (eventos.some((e) => e.id === atual) ? atual : eventos[0]?.id || ""));
  }, [eventos]);

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
    return <p className="text-sm text-slate-500">Nenhum torneio criado ainda.</p>;
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
