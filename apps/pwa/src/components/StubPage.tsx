import { PwaLayout } from "./PwaLayout";

export function StubPage({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <PwaLayout>
      <div className="p-5">
        <h1 className="text-lg font-bold text-ps-azul-escuro">{titulo}</h1>
        <p className="text-sm text-slate-500 mt-1">{descricao}</p>
        <div className="mt-6 bg-white rounded-xl border border-dashed border-ps-cinza p-8 text-center text-sm text-slate-400">
          Em construcao.
        </div>
      </div>
    </PwaLayout>
  );
}
