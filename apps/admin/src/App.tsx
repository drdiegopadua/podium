import { Route, Routes } from "react-router-dom";
import { Login } from "./pages/login/Login";
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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="/eventos" element={<ListaEventos />} />
      <Route path="/eventos/criar" element={<CriarEvento />} />
      <Route path="/eventos/:id/editar" element={<EditarEvento />} />
      <Route path="/eventos/:id/sorteio" element={<Sorteio />} />
      <Route path="/eventos/configuracoes" element={<Configuracoes />} />
      <Route path="/equipes" element={<Equipes />} />
      <Route path="/atletas" element={<Atletas />} />
      <Route path="/jogos-agenda" element={<JogosAgenda />} />
      <Route path="/sumulas" element={<Sumulas />} />
      <Route path="/classificacao" element={<Classificacao />} />
    </Routes>
  );
}
