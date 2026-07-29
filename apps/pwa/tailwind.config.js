/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "ps-azul-escuro": "#0A2342",
        "ps-azul-marinho": "#132F57",
        "ps-dourado": "#D4AF37",
        "ps-branco": "#FFFFFF",
        "ps-cinza-claro": "#F5F7FA",
        "ps-cinza": "#CBD5E1",
        "ps-verde": "#22C55E",
        "ps-vermelho": "#EF4444",
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
};
