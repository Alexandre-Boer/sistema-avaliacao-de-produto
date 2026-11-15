import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/server/products/product";

/**
 * Bloco exibido quando o produto não tem imagem: as três barras da marca sobre
 * a mesma grade fina do painel de marca, em tons neutros.
 */
function ImagePlaceholder() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:2rem_2rem] text-muted-foreground">
      <svg
        aria-hidden="true"
        width="44"
        height="36"
        viewBox="0 0 44 36"
        className="fill-current opacity-40"
      >
        <rect width="22" height="8" rx="4" />
        <rect y="14" width="34" height="8" rx="4" />
        <rect y="28" width="44" height="8" rx="4" />
      </svg>
      <span className="text-xs">Sem imagem</span>
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow] duration-200 focus-within:border-ring hover:border-ring/60 hover:shadow-[0_18px_40px_-28px_var(--deep)]">
      <div className="relative aspect-[4/3] overflow-hidden border-b bg-muted">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-lg leading-snug font-semibold tracking-tight">
          {/* O ::after estende a área clicável do nome para o card inteiro. */}
          <Link
            href={`/products/${product.id}`}
            className="decoration-signal decoration-2 underline-offset-4 outline-none after:absolute after:inset-0 after:content-[''] group-hover:underline focus-visible:underline"
          >
            {product.name}
          </Link>
        </h3>

        {product.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-foreground/80">
            {product.description}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Sem descrição
          </p>
        )}

        <a
          href={product.externalLink}
          target="_blank"
          rel="noreferrer"
          className="relative z-10 mt-auto inline-flex items-center gap-1 self-start rounded-sm pt-2 text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Ver na loja
          <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
          <span className="sr-only">(abre em nova aba)</span>
        </a>
      </div>
    </article>
  );
}
