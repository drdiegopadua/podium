/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tema escuro Arena Sports; "destaque" vem da cor da empresa organizadora
        fundo: "#0B0B0C",
        cartao: "#161618",
        "cartao-2": "#1F1F23",
        borda: "#26262B",
        cinza: "#8B8B94",
        preto: "#0B0B0C",
        destaque: "var(--cor-destaque)",
        "ps-verde": "#22C55E",
        "ps-vermelho": "#FF5A5F",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Oswald", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
