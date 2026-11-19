# Arquitetura do Projeto

## Front-End
Vamos utilizar as seguintes ferramentas:
- TypeScript: Linguagem principal de desenvolvimento com tipagem
- Next.js: Framework para criação e gestão de interfaces + APIs
- React.js: Biblioteca para criação e componentização de interfaces
- Biome: Validação / formatação / Correção de código (lint)
- TailwindCSS: Estilização
- Date-FNS: Manipulação de data/hora
- Shadcn: Componentização base (design system)
- React Query: Criação e gestão de queries para ler dados da API e mutations para alterar dados

## Back-End
Vamos utilizar as seguintes ferramentas:
- TypeScript: Linguagem principal de desenvolvimento com tipagem
- Next.js: Framework para criação e gestão de interfaces + APIs
- bcryptjs: Geração de salt + hash da senha
- Mastra.ai: Criação e customização de agentes internos
- TRPC: Gestão de endpoints

## Banco de dados
Supabase: PostgresSQL

## Infraestrutura
Vercel: Hospedar tanto o servido (API) quanto cliente (SPA)

## Automação
- n8n: Criação de fluxos automatizados

## Inteligência Artificial
- Mastra (`@mastra/core`): definição do agente que resume as avaliações de um produto (`src/mastra/agents/feedback-summary-agent.ts`)
- Modelo configurável por variável de ambiente: `openai/gpt-4o-mini` por padrão; em desenvolvimento, um modelo local gratuito via Ollama (`infra/ollama/docker-compose.yml`)
- O resumo fica guardado na tabela `products_ai_summaries` e só é refeito quando chega avaliação nova
