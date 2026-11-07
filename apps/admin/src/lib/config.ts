/** Endereco do app PWA dos torcedores/atletas (trim: protege contra espacos/BOM vindos da Vercel). */
export const URL_PWA = (((import.meta.env.VITE_PWA_URL as string | undefined) ?? "").replace(/^﻿/, "").trim() ||
  "https://arenasportsbr.vercel.app"
).replace(/\/$/, "");

/** Link que abre direto um torneio no app (mesmo usado no QR Code). */
export const linkTorneioNoApp = (codigo: string) => `${URL_PWA}/e/${codigo}`;
