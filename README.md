# LogixOne

> Nome interno/técnico do projeto: `sisencomendas` (pacote npm, schema
> Postgres, roles do banco e projeto na Vercel continuam com esse nome).

SaaS multi-tenant para substituir o caderno de papel do controle de encomendas
em condominios (portaria). Registro de encomendas, central da portaria, abas
Pendentes/Entregues/Historico com busca, relatorios com export PDF/Excel,
gestao de moradores e usuarios, e configuracoes do condominio.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **TailwindCSS** + **shadcn/ui** (estilo base-nova, sobre `@base-ui/react`)
- **Drizzle ORM** + **PostgreSQL** (hospedado no Supabase)
- **Supabase Auth** (GoTrue) para login
- **TanStack Query** + **React Hook Form** + **Zod**
- Deploy: **Vercel** · Gerenciador de pacotes: **pnpm**

Isolamento entre condominios via Row Level Security no Postgres.

## Rodando localmente

```bash
pnpm install
cp .env.example .env.local   # preencha com os valores reais
pnpm dev
```

Abra http://localhost:3000.

> O `next dev` local e o app na Vercel usam o **mesmo** banco Supabase — nao
> ha um banco de staging separado. Trate mudancas de dados no dev local como
> mudancas em producao.

## Scripts

| Comando | Descricao |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Build de producao + `serwist build` (service worker) |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm db:generate` | Gera migration a partir do schema Drizzle |
| `pnpm db:migrate` | Aplica migrations (Postgres local legado) |
| `pnpm db:seed` | Popula dados de seed (Postgres local legado) |

## Estrutura

- `src/app/(app)/<feature>/` — cada feature CRUD segue o mesmo padrao:
  `repositories/`, `schemas/`, `actions.ts` (`"use server"`), componentes de
  lista e dialog.
- `src/lib/` — db, supabase clients, jwt, helpers de erro.
- `src/services/` — auth, storage.
- `supabase/deploy.sql` — schema + RLS aplicados ao projeto Supabase.
- `supabase/CUTOVER.md` — notas da migracao do Postgres local para o Supabase.

## Seguranca

- Nenhum segredo no repositorio: `.env*` e `.claude/settings.local.json` sao
  gitignorados. Chaves e connection strings vivem apenas em `.env.local`
  (local) e nas env vars da Vercel (producao).
- RLS aplica o isolamento multi-tenant no nivel do banco; as `actions.ts`
  revalidam papel/sessao antes de cada mutacao (defense in depth).
