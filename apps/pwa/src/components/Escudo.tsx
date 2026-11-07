/** Escudo da equipe; sem imagem, mostra as iniciais. */
export function Escudo({
  nome,
  url,
  tamanho = 32,
  className = "",
}: {
  nome?: string | null;
  url?: string | null;
  tamanho?: number;
  className?: string;
}) {
  const estilo = { width: tamanho, height: tamanho };
  if (url) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        style={estilo}
        className={`shrink-0 rounded-full bg-cartao-2 object-contain p-0.5 ${className}`}
      />
    );
  }
  const iniciais = (nome ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      style={{ ...estilo, fontSize: tamanho * 0.36 }}
      className={`shrink-0 rounded-full bg-cartao-2 border border-borda text-cinza font-bold flex items-center justify-center ${className}`}
    >
      {iniciais}
    </span>
  );
}
