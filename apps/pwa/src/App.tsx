import { Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { LoginCadastro } from "./pages/login-cadastro/LoginCadastro";
import { VincularEquipe } from "./pages/vincular-equipe/VincularEquipe";
import { PerfilAtleta } from "./pages/perfil-atleta/PerfilAtleta";
import { Jogos } from "./pages/jogos/Jogos";
import { Classificacao } from "./pages/classificacao/Classificacao";
import { SumulaGenerica } from "./pages/sumula/generico/SumulaGenerica";
import { InfoEvento } from "./pages/info-evento/InfoEvento";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginCadastro />} />
      <Route path="/vincular-equipe" element={<VincularEquipe />} />
      <Route path="/perfil" element={<PerfilAtleta />} />
      <Route path="/jogos" element={<Jogos />} />
      <Route path="/classificacao" element={<Classificacao />} />
      <Route path="/sumula/:jogoId" element={<SumulaGenerica />} />
      <Route path="/e/:codigoEvento" element={<InfoEvento />} />
      <Route path="/evento" element={<InfoEvento />} />
    </Routes>
  );
}
