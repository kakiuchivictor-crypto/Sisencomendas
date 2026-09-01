# Corte para o Supabase real (projeto compartilhado)

Este documento cobre os passos **manuais** que faltam para migrar o SisEncomendas
do Postgres local + auth-shim para um projeto Supabase real que ja hospeda outro
app (o sistema de psicologos). A aplicacao foi construida desde o inicio para
que essa migracao seja so troca de configuracao/implementacao pontual — nao
uma reescrita.

Nada disto foi executado automaticamente porque exige credenciais reais do seu
projeto Supabase, que so voce tem.

## 0. O que ja esta pronto no codigo

- Todo o schema mora em `sisencomendas` (nao em `public`), isolado do outro app.
- RLS usa `sisencomendas.current_condominio_id()`/`current_usuario_role()`, que
  dependem so de `auth.uid()` — a mesma funcao que o Supabase Auth fornece
  nativamente. Nenhuma policy le claims customizadas do JWT.
- `supabase/deploy.sql` cria toda a estrutura sem tocar em `public` nem em
  `auth` (alem de uma FK para `auth.users`, que ja existe no projeto).

## 1. Rodar o script de deploy

1. Abra o SQL Editor do projeto Supabase compartilhado.
2. Cole e rode `supabase/deploy.sql` (raiz deste repo) inteiro.
3. Confirme no final que nao houve erro e que as tabelas aparecem em
   `Database > Schemas > sisencomendas` (pode ser preciso marcar "sisencomendas"
   como schema exposto na API em Project Settings > API, se for usar
   PostgREST/`supabase-js` para acessar as tabelas diretamente — nao e
   necessario se o acesso continuar via `postgres.js`/Drizzle com a connection
   string, como hoje).

## 2. Variaveis de ambiente

No painel do Supabase: Project Settings > API (para URL/anon key) e
Project Settings > Database (para a connection string).

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # novo — substitui o papel do dbService local
DATABASE_URL=postgres://...          # connection string "Transaction pooler" (Supavisor)
```

- `MIGRATION_DATABASE_URL` e `SUPABASE_JWT_SECRET` (usados pelo shim local)
  deixam de ser necessarios em producao — o Supabase assina/valida os JWTs
  internamente e as migrations passam a rodar via `supabase/deploy.sql` no SQL
  Editor, nao mais via `pnpm db:migrate`.
- Mantenha o `.env.local` atual apontando para o Postgres local — ele continua
  valendo para desenvolvimento. So o ambiente de producao (Vercel etc.) aponta
  para o Supabase.

## 3. Trocar a autenticacao (shim bcrypt → Supabase Auth real)

Hoje `src/services/auth/auth-service.ts` faz hash/compare de senha na mao e
`src/services/auth/session.ts` assina um JWT proprio com `jose`. Isso precisa
virar chamadas reais ao Supabase Auth:

1. Instalar `@supabase/supabase-js` e `@supabase/ssr`.
2. Criar um client Supabase por request (server) e um client de browser,
   seguindo o padrao `@supabase/ssr` para Next.js App Router (cookies
   `sb-access-token`/`sb-refresh-token` gerenciados pela lib, nao mais por
   `src/lib/jwt.ts`).
3. `signInWithPassword()` em `auth-service.ts` passa a chamar
   `supabase.auth.signInWithPassword({ email, password })` em vez de
   comparar hash manualmente. O rate limiting proprio
   (`sisencomendas.login_throttle`, `registerFailedAttempt`/`clearThrottle` em
   `auth-service.ts`) pode ser removido — o GoTrue do Supabase ja faz rate
   limiting de login nativamente.
4. `signOut()` passa a chamar `supabase.auth.signOut()`.
5. `src/proxy.ts` passa a usar o helper de sessao do `@supabase/ssr`
   (`updateSession`) em vez de `verifySessionToken`/`SESSION_COOKIE_NAME`.
6. `getSessionClaims()` em `session.ts` passa a ler `supabase.auth.getUser()`
   em vez de decodificar o cookie manualmente. Os campos `app_role`/
   `condominio_id` que hoje vem embutidos no JWT (so para UI, nunca para
   autorizacao — ver comentario em `src/lib/db.ts`) precisam ser buscados por
   uma query a `sisencomendas.usuarios` apos o login, ja que o Supabase Auth
   nao permite claims customizadas por padrao sem Auth Hooks.
7. `src/db/schema/auth.ts` (a tabela `authUsers` local) deixa de ser usada
   pela aplicacao — `auth.users` passa a ser gerenciada 100% pelo GoTrue.
   Pode ficar no repo so como referencia/tipo, ou ser removida.

## 4. Criar os primeiros usuarios no Supabase real

Nao existe mais `pnpm db:seed` inserindo hash de senha direto na tabela —
usuarios precisam ser criados via Supabase Auth. Duas opcoes:

- **Painel**: Authentication > Users > Add user (email + senha), depois um
  `INSERT INTO sisencomendas.usuarios (id, condominio_id, nome, role) VALUES (...)`
  manual no SQL Editor usando o UUID gerado.
- **Script com service_role**: um script Node one-off usando
  `supabase.auth.admin.createUser()` (precisa da `SUPABASE_SERVICE_ROLE_KEY`,
  nunca exposta ao client) seguido do insert em `sisencomendas.usuarios` — o
  equivalente ao `usuario-repository.ts::create()` atual, trocando o hash
  manual pela API admin do GoTrue.

## 5. `withTenantContext` / conexao com o banco

`src/lib/db.ts` hoje abre transacao via `postgres.js` e faz
`set_config('request.jwt.claims', ...)` manualmente porque e voce quem imita
o PostgREST. Duas opcoes ao migrar:

- **Manter `postgres.js` + `set_config`**: funciona igual, só trocando a
  connection string para a do Supabase (modo "Session" do pooler, nao
  "Transaction", porque `SET LOCAL` dentro de uma transacao exige que a mesma
  conexao fisica persista durante a transacao). Mais proximo do que ja existe
  hoje, exige menos mudanca de codigo.
- **Migrar para `supabase-js` client-side/RLS via PostgREST**: joga fora
  `withTenantContext` e os repositories atuais, deixando o Supabase aplicar
  RLS a partir do JWT da sessao automaticamente. Reescrita maior, nao
  recomendada nesta etapa.

Recomendacao: manter a primeira opcao — e a que exige menos mudanca e reusa
tudo que ja foi validado (repositories, RLS, funcoes SECURITY DEFINER).

## 6. Validar depois do corte

Repita manualmente o que foi validado localmente nesta sessao:

1. Logar com um usuario admin real e um porteiro real.
2. Confirmar que cada um so ve dados do proprio condominio (teste com 2
   condominios/2 contas caso o outro app do Supabase tambem exponha dados —
   confirme que a UI do SisEncomendas nunca lista nada de fora de
   `sisencomendas.*`).
3. Trocar o role de um usuario direto no banco (`UPDATE sisencomendas.usuarios
   SET role = 'porteiro' WHERE ...`) e confirmar que o acesso muda na
   proxima requisicao, sem precisar logar de novo — e exatamente o que a
   troca para funcoes SECURITY DEFINER garante.
4. Rodar `pnpm build` apontando `DATABASE_URL` para o Supabase antes do
   deploy final, para pegar qualquer erro de tipagem/conexao cedo.

## 7. O que NAO fazer

- Nao rode `pnpm db:migrate` (`src/db/migrate.ts`) contra o Supabase — ele
  tenta criar o schema `drizzle` de tracking de migrations e assume que e
  dono de todo o banco. Use sempre `supabase/deploy.sql` colado manualmente
  no SQL Editor.
- Nao dê `GRANT` para o role `authenticated` em nada fora de
  `sisencomendas.*` — isso afetaria o outro app.
- Nao rode nenhum `DROP SCHEMA public` / `DROP SCHEMA auth` — nenhum destes
  scripts encosta nesses schemas, mas vale reforcar: qualquer SQL manual
  adicional que voce rodar no mesmo projeto deve manter esse mesmo cuidado.
