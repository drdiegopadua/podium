import { PwaLayout } from "./PwaLayout";

export function StubPage({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <PwaLayout>
      <div className="p-5">
        <h1 className="text-lg font-bold text-white">{titulo}</h1>
        <p className="text-sm text-cinza mt-1">{descricao}</p>
        <div className="mt-6 bg-cartao rounded-2xl border border-dashed border-borda p-8 text-center text-sm text-cinza">
          Em construcao.
        </div>
      </div>
    </PwaLayout>
  );
}
