import { useEffect, useRef, useState, type DragEvent } from "react";
import { validarImagem } from "../lib/upload";

interface Props {
  /** URL ja salva (ex.: logo atual) */
  urlAtual?: string | null;
  /** Arquivo escolhido e ainda nao enviado */
  arquivo: File | null;
  onChange: (arquivo: File | null) => void;
  /** Usuario pediu para remover a imagem salva */
  onRemover?: () => void;
  rotulo?: string;
  dica?: string;
  redondo?: boolean;
  tamanho?: "md" | "lg";
}

/** Campo de imagem com previa, clique ou arraste para enviar. */
export function CampoImagem({
  urlAtual,
  arquivo,
  onChange,
  onRemover,
  rotulo = "Enviar imagem",
  dica = "PNG, JPG, WebP ou SVG · fundo transparente fica melhor",
  redondo = false,
  tamanho = "lg",
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);

  useEffect(() => {
    if (!arquivo) {
      setPrevia(null);
      return;
    }
    const url = URL.createObjectURL(arquivo);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  function escolher(f: File | undefined | null) {
    if (!f) return;
    const problema = validarImagem(f);
    setErro(problema);
    if (!problema) onChange(f);
  }

  function soltar(e: DragEvent) {
    e.preventDefault();
    setArrastando(false);
    escolher(e.dataTransfer.files?.[0]);
  }

  const imagem = previa ?? urlAtual ?? null;
  const lado = tamanho === "lg" ? "w-28 h-28" : "w-20 h-20";
  const forma = redondo ? "rounded-full" : "rounded-2xl";

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltar}
        className={`${lado} ${forma} shrink-0 overflow-hidden border-2 border-dashed flex items-center justify-center bg-cartao-2 transition-colors ${
          arrastando ? "border-destaque" : "border-borda hover:border-destaque"
        }`}
        aria-label={rotulo}
      >
        {imagem ? (
          <img src={imagem} alt="" className="w-full h-full object-contain p-2" />
        ) : (
          <span className="text-3xl text-cinza leading-none">+</span>
        )}
      </button>
      <div className="text-sm space-y-1">
        <button type="button" onClick={() => input.current?.click()} className="font-semibold text-destaque">
          {imagem ? "Trocar imagem" : rotulo}
        </button>
        {(arquivo || (urlAtual && onRemover)) && (
          <button
            type="button"
            onClick={() => {
              if (arquivo) onChange(null);
              else onRemover?.();
              if (input.current) input.current.value = "";
            }}
            className="block text-xs text-cinza underline"
          >
            Remover
          </button>
        )}
        <p className="text-xs text-cinza">{dica}</p>
        {erro && <p className="text-xs text-ps-vermelho">{erro}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        className="hidden"
        onChange={(e) => escolher(e.target.files?.[0])}
      />
    </div>
  );
}
