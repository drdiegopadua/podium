import { Layout } from "./Layout";
import { PageHeader } from "./PageHeader";

export function StubPage({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <Layout>
      <PageHeader title={titulo} subtitle={descricao} />
      <div className="bg-white rounded-xl border border-dashed border-ps-cinza p-10 text-center text-sm text-slate-400">
        Em construcao.
      </div>
    </Layout>
  );
}
