import { ArrowSquareOutIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { Product } from "@/server/products/product";

/** `next/image` só aceita hosts https (ver `next.config.ts`); o resto cai no placeholder. */
function isHttps(url: string | null): url is string {
  return Boolean(url?.startsWith("https://"));
}

/** Evita `href` com esquemas como `javascript:` vindos do cadastro do produto. */
function isWebLink(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** Placeholder da imagem: as três barras da marca sobre o painel petróleo. */
function ImagePlaceholder() {
  return (
    <div className="brand-panel flex size-full items-center justify-center">
      <svg aria-hidden="true" width="96" height="72" viewBox="0 0 96 72">
        <rect width="44" height="14" rx="7" className="fill-signal/50" />
        <rect y="29" width="70" height="14" rx="7" className="fill-signal/75" />
        <rect y="58" width="96" height="14" rx="7" className="fill-signal" />
      </svg>
      <span className="sr-only">Produto sem imagem</span>
    </div>
  );
}

export function ProductHeader({ product }: { product: Product }) {
  return (
    <header className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-center md:gap-12">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
        {isHttps(product.imageUrl) ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 768px) 28rem, 100vw"
            className="object-cover"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>

      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-balance break-words sm:text-4xl">
          {product.name}
        </h1>
        {product.description && (
          <p className="mt-4 max-w-[60ch] whitespace-pre-line text-base leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}
        {isWebLink(product.externalLink) && (
          <Button
            asChild
            variant="outline"
            className="mt-6 h-11 rounded-md px-5 text-[15px] font-semibold"
          >
            <a href={product.externalLink} target="_blank" rel="noreferrer">
              Ver na loja
              <ArrowSquareOutIcon aria-hidden="true" />
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          </Button>
        )}
      </div>
    </header>
  );
}
