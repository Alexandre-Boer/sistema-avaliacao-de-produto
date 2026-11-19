This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Resumo da IA

A página de cada produto mostra um resumo das avaliações gerado por um agente [Mastra](https://mastra.ai). O modelo é escolhido em `.env.local`:

| Variável | Para que serve |
| --- | --- |
| `AI_SUMMARY_MODEL` | Id do modelo no formato `provedor/modelo`. Padrão: `openai/gpt-4o-mini`. |
| `OPENAI_API_KEY` | Chave da OpenAI, exigida pelos modelos `openai/...` (`ANTHROPIC_API_KEY` para `anthropic/...`). |
| `AI_SUMMARY_BASE_URL` | Endereço de uma API compatível com a da OpenAI. Com ela nenhuma chave é exigida. |
| `AI_SUMMARY_API_KEY` | Chave opcional para o endereço acima. |

Para testar sem custo, com um modelo local pelo [Ollama](https://ollama.com):

```bash
docker compose -f ollama/docker-compose.yml up -d
docker exec sap-ollama ollama pull gemma3:4b
```

```bash
# .env.local
AI_SUMMARY_MODEL=custom/gemma3:4b
AI_SUMMARY_BASE_URL=http://localhost:11434/v1
```

Sem nenhuma dessas variáveis a aplicação funciona normalmente, só sem o bloco de resumo. O resumo aparece em produtos com 3 ou mais avaliações.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
