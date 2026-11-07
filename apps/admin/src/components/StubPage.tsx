import { Layout } from "./Layout";
import { PageHeader } from "./PageHeader";

export function StubPage({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <Layout>
      <PageHeader title={titulo} subtitle={descricao} />
      <div className="bg-cartao rounded-2xl border border-dashed border-borda p-10 text-center text-sm text-cinza">
        Em construcao.
      </div>
    </Layout>
  );
}
