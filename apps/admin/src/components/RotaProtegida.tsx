import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSessao } from "../contexts/SessaoContext";

export function RotaProtegida({ children }: { children: ReactNode }) {
  const { carregando, sessao, empresaAtual } = useSessao();
  const local = useLocation();

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-cinza">
        Carregando...
      </div>
    );
  }

  if (!sessao) return <Navigate to="/login" replace state={{ de: local.pathname }} />;

  // Logado mas sem empresa vinculada: precisa criar (ou ser convidado para) uma.
  if (!empresaAtual && local.pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}
