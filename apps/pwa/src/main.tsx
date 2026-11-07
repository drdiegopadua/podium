import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { TorneioProvider } from "./lib/torneio";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <TorneioProvider>
        <App />
      </TorneioProvider>
    </BrowserRouter>
  </React.StrictMode>
);
