import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { RotaProtegida } from "./components/RotaProtegida";
import { Login } from "./pages/login/Login";
import { Onboarding } from "./pages/onboarding/Onboarding";
import { Dashboard } from "./pages/dashboard/Dashboard";
import { ListaEventos } from "./pages/eventos/ListaEventos";
import { CriarEvento } from "./pages/eventos/criar-evento/CriarEvento";
import { EditarEvento } from "./pages/eventos/editar-evento/EditarEvento";
import { Sorteio } from "./pages/eventos/sorteio/Sorteio";
import { Configuracoes } from "./pages/eventos/configuracoes/Configuracoes";
import { Equipes } from "./pages/equipes/Equipes";
import { Atletas } from "./pages/atletas/Atletas";
import { JogosAgenda } from "./pages/jogos-agenda/JogosAgenda";
import { Sumulas } from "./pages/sumulas/Sumulas";
import { Classificacao } from "./pages/classificacao/Classificacao";
import { MinhaEmpresa } from "./pages/empresa/MinhaEmpresa";
import { Artes } from "./pages/divulgacao/Artes";
import { Mural } from "./pages/divulgacao/Mural";
import { Patrocinadores } from "./pages/divulgacao/Patrocinadores";

const protegida = (el: ReactNode) => <RotaProtegida>{el}</RotaProtegida>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={protegida(<Onboarding />)} />
      <Route path="/" element={protegida(<Dashboard />)} />
      <Route path="/empresa" element={protegida(<MinhaEmpresa />)} />
      <Route path="/eventos" element={protegida(<ListaEventos />)} />
      <Route path="/eventos/criar" element={protegida(<CriarEvento />)} />
      <Route path="/eventos/:id/editar" element={protegida(<EditarEvento />)} />
      <Route path="/eventos/:id/sorteio" element={protegida(<Sorteio />)} />
      <Route path="/eventos/configuracoes" element={protegida(<Configuracoes />)} />
      <Route path="/equipes" element={protegida(<Equipes />)} />
      <Route path="/atletas" element={protegida(<Atletas />)} />
      <Route path="/jogos-agenda" element={protegida(<JogosAgenda />)} />
      <Route path="/sumulas" element={protegida(<Sumulas />)} />
      <Route path="/classificacao" element={protegida(<Classificacao />)} />
      <Route path="/artes" element={protegida(<Artes />)} />
      <Route path="/mural" element={protegida(<Mural />)} />
      <Route path="/patrocinadores" element={protegida(<Patrocinadores />)} />
    </Routes>
  );
}
