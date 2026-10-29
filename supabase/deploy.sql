-- =============================================================================
-- SisEncomendas — script de deploy para um projeto Supabase COMPARTILHADO
-- =============================================================================
--
-- Este script cria toda a estrutura do SisEncomendas dentro do schema
-- dedicado "sisencomendas", isolado de qualquer outro app que ja exista no
-- mesmo projeto Supabase (ex: o sistema de psicologos). Ele:
--
--   - NAO cria nem altera nada no schema "public" (onde o outro app provavelmente
--     guarda suas tabelas).
--   - NAO cria nem altera nada no schema "auth" (gerenciado pelo Supabase Auth/
--     GoTrue) alem de uma FK apontando para auth.users — nao criamos a tabela,
--     nao criamos auth.uid()/auth.role()/auth.jwt(): o Supabase ja fornece
--     essas funcoes nativamente em qualquer projeto.
--   - So usa "IF NOT EXISTS"/"CREATE OR REPLACE" e blocos DO com tratamento de
--     "ja existe" (ver comentarios), para que rodar este script nao apague nem
--     substitua nada do outro app, e possa ser reexecutado com seguranca.
--
-- COMO USAR:
--   1. Abra o SQL Editor do seu projeto Supabase (o mesmo que ja tem o app de
--      psicologos).
--   2. Cole o conteudo deste arquivo inteiro e rode.
--   3. Confira o final do arquivo para os GRANTs — eles usam o role nativo
--      "authenticated" do Supabase (equivalente ao "sisencomendas_app" local).
--   4. Depois de rodar isto, siga o CUTOVER.md nesta mesma pasta para trocar
--      as variaveis de ambiente e o servico de autenticacao da aplicacao.
--
-- Este script e IDEMPOTENTE na parte estrutural (schema, extensao, grants).
-- CREATE TYPE e CREATE POLICY nao tem "IF NOT EXISTS" nativo no Postgres, entao
-- estao envoltos em blocos DO que ignoram o erro "ja existe" — rodar de novo
-- não falha, mas tambem nao altera o que ja foi criado (edite manualmente se
-- precisar mudar uma policy).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Schema dedicado + extensao
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS sisencomendas;

-- Instalada explicitamente no schema "extensions" (convencao do Supabase,
-- e onde pgcrypto/uuid-ossp ja vivem nesse projeto) — sem isso, o search_path
-- padrao ("$user", public, extensions) faria o pg_trgm cair em "public",
-- que e do outro app.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;


-- -----------------------------------------------------------------------------
-- 2. Enums (namespaced em sisencomendas — nao colidem com enums de outro app)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE sisencomendas.encomenda_status AS ENUM ('pendente', 'entregue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sisencomendas.tema AS ENUM ('claro', 'escuro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sisencomendas.tipo_encomenda AS ENUM
    ('caixa', 'pacote', 'envelope', 'documento', 'medicamento', 'carta', 'outros');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sisencomendas.transportadora AS ENUM
    ('correios', 'mercado_livre', 'amazon', 'shopee', 'jadlog', 'loggi',
     'total_express', 'fedex', 'ups', 'dhl', 'outros');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sisencomendas.usuario_role AS ENUM ('desenvolvedor', 'administracao', 'porteiro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sisencomendas.log_acao AS ENUM
    ('encomenda_criada', 'encomenda_entregue', 'encomenda_revertida', 'encomenda_excluida',
     'item_adicionado_lote', 'correspondencia_criada', 'morador_criado', 'morador_atualizado',
     'morador_excluido', 'usuario_criado', 'usuario_atualizado', 'usuario_excluido',
     'configuracoes_atualizadas');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- -----------------------------------------------------------------------------
-- 3. Tabelas
-- -----------------------------------------------------------------------------
-- usuarios.id referencia auth.users(id), a tabela real gerenciada pelo
-- Supabase Auth (GoTrue) — ja existe no projeto, nao e criada aqui.
CREATE TABLE IF NOT EXISTS sisencomendas.condominios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  logo_url text,
  tema sisencomendas.tema NOT NULL DEFAULT 'claro',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sisencomendas.condominios ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS sisencomendas.usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  condominio_id uuid NOT NULL REFERENCES sisencomendas.condominios (id) ON DELETE CASCADE,
  nome text NOT NULL,
  -- Duplicado de auth.users.email de proposito: "authenticated" nao tem (e
  -- nao deve ter) acesso direto a auth.users no Supabase real, entao a tela
  -- de usuarios le o email daqui em vez de fazer join com auth.users.
  email text NOT NULL UNIQUE,
  role sisencomendas.usuario_role NOT NULL DEFAULT 'porteiro',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sisencomendas.usuarios ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS usuarios_condominio_idx ON sisencomendas.usuarios (condominio_id);

CREATE TABLE IF NOT EXISTS sisencomendas.moradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id uuid NOT NULL REFERENCES sisencomendas.condominios (id) ON DELETE CASCADE,
  nome text NOT NULL,
  rua text NOT NULL,
  numero text NOT NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sisencomendas.moradores ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS moradores_condominio_idx ON sisencomendas.moradores (condominio_id);
CREATE INDEX IF NOT EXISTS moradores_nome_trgm_idx ON sisencomendas.moradores USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS moradores_rua_trgm_idx ON sisencomendas.moradores USING gin (rua gin_trgm_ops);

-- Lista de remetentes de Correspondencia (cartorio, IP Urgente, DHL etc.) —
-- aberta por condominio: qualquer usuario cadastra um novo na hora, sem
-- precisar de migration (ao contrario do enum fixo "transportadora").
CREATE TABLE IF NOT EXISTS sisencomendas.remetentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id uuid NOT NULL REFERENCES sisencomendas.condominios (id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sisencomendas.remetentes ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS remetentes_condominio_nome_idx ON sisencomendas.remetentes (condominio_id, nome);

-- Catalogo de transportadoras personalizadas (J&T, Shein...) por condominio —
-- complementa o enum fixo sisencomendas.transportadora (por isso o plural:
-- o singular colide com o enum). Encomendas NAO referenciam esta tabela:
-- continuam gravando transportadora = 'outros' + transportadora_outro = nome.
-- Unicidade case-insensitive via indice em lower(nome). Mesmas definicoes
-- aplicadas em producao (so acrescido IF NOT EXISTS, padrao deste arquivo).
CREATE TABLE IF NOT EXISTS sisencomendas.transportadoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  condominio_id uuid NOT NULL REFERENCES sisencomendas.condominios (id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transportadoras_nome_valido CHECK (nome = btrim(nome) AND char_length(nome) BETWEEN 1 AND 60)
);
CREATE UNIQUE INDEX IF NOT EXISTS transportadoras_condominio_nome_idx ON sisencomendas.transportadoras (condominio_id, lower(nome));
ALTER TABLE sisencomendas.transportadoras ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE sisencomendas.transportadoras IS 'Catalogo de nomes de transportadoras por condominio (sem FK a partir de encomendas). RLS por current_condominio_id(); sem UPDATE/DELETE para authenticated.';

CREATE TABLE IF NOT EXISTS sisencomendas.encomendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Agrupa itens cadastrados juntos numa mesma submissao (ex: 1 caixa + 1
  -- pacote do mesmo morador/transportadora). Entregar/reverter um item
  -- entrega/reverte o lote inteiro (ver funcao entregar do repository).
  lote_id uuid NOT NULL DEFAULT gen_random_uuid(),
  condominio_id uuid NOT NULL REFERENCES sisencomendas.condominios (id) ON DELETE CASCADE,
  morador_id uuid NOT NULL REFERENCES sisencomendas.moradores (id) ON DELETE RESTRICT,
  rua text NOT NULL,
  numero text NOT NULL,
  -- Nulo pra "carta" (correspondencia): essas usam remetente_id em vez disso.
  -- Obrigatorio pra encomendas normais, mas isso e reforcado no Zod, nao aqui.
  transportadora sisencomendas.transportadora,
  transportadora_outro text,
  -- So usado quando tipo = 'carta' — remetente da correspondencia, escolhido
  -- de uma lista que cresce por condominio (ver sisencomendas.remetentes).
  remetente_id uuid REFERENCES sisencomendas.remetentes (id) ON DELETE SET NULL,
  tipo sisencomendas.tipo_encomenda NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  codigo_rastreio text,
  nota_fiscal text,
  observacoes text,
  foto_url text,
  status sisencomendas.encomenda_status NOT NULL DEFAULT 'pendente',
  recebida_por uuid NOT NULL REFERENCES sisencomendas.usuarios (id) ON DELETE RESTRICT,
  recebida_em timestamptz NOT NULL DEFAULT now(),
  entregue_por uuid REFERENCES sisencomendas.usuarios (id) ON DELETE RESTRICT,
  entregue_em timestamptz,
  -- Nome de quem retirou fisicamente a encomenda (morador/familiar/terceiro
  -- autorizado) — texto livre, diferente de entregue_por (o PORTEIRO que deu
  -- baixa). Prova de quem levou o volume, pra disputas tipo "nunca recebi".
  retirado_por text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT encomendas_quantidade_positive CHECK (quantidade >= 1)
);
ALTER TABLE sisencomendas.encomendas ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS encomendas_condominio_status_idx ON sisencomendas.encomendas (condominio_id, status);
CREATE INDEX IF NOT EXISTS encomendas_morador_idx ON sisencomendas.encomendas (morador_id);
CREATE INDEX IF NOT EXISTS encomendas_lote_idx ON sisencomendas.encomendas (lote_id);
-- Cobrem status + ordenacao usados por listEntregues/listPendentes.
CREATE INDEX IF NOT EXISTS encomendas_condominio_status_entregue_idx ON sisencomendas.encomendas (condominio_id, status, entregue_em);
CREATE INDEX IF NOT EXISTS encomendas_condominio_status_recebida_idx ON sisencomendas.encomendas (condominio_id, status, recebida_em);
-- Relatorios filtram por condominio + intervalo de recebida_em.
CREATE INDEX IF NOT EXISTS encomendas_condominio_recebida_idx ON sisencomendas.encomendas (condominio_id, recebida_em);
CREATE INDEX IF NOT EXISTS encomendas_rua_trgm_idx ON sisencomendas.encomendas USING gin (rua gin_trgm_ops);
CREATE INDEX IF NOT EXISTS encomendas_numero_trgm_idx ON sisencomendas.encomendas USING gin (numero gin_trgm_ops);
CREATE INDEX IF NOT EXISTS encomendas_codigo_rastreio_trgm_idx ON sisencomendas.encomendas USING gin (codigo_rastreio gin_trgm_ops);
CREATE INDEX IF NOT EXISTS encomendas_nota_fiscal_trgm_idx ON sisencomendas.encomendas USING gin (nota_fiscal gin_trgm_ops);

-- Trilha de auditoria: quem fez o que, e quando — visivel so para
-- "desenvolvedor" (ver policy abaixo). usuario_nome e descricao sao
-- capturados no momento da acao (nao vem de JOIN) para o registro
-- continuar fazendo sentido mesmo que o usuario/entidade seja depois
-- editado ou excluido. Sem policy de update/delete de proposito: um log
-- que pode ser apagado deixa de servir como auditoria confiavel.
CREATE TABLE IF NOT EXISTS sisencomendas.log_atividade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id uuid NOT NULL REFERENCES sisencomendas.condominios (id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES sisencomendas.usuarios (id) ON DELETE SET NULL,
  usuario_nome text NOT NULL,
  acao sisencomendas.log_acao NOT NULL,
  descricao text NOT NULL,
  entidade_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sisencomendas.log_atividade ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS log_atividade_condominio_criado_idx ON sisencomendas.log_atividade (condominio_id, created_at);

-- login_throttle NAO e criada aqui: e um mecanismo de rate limiting do nosso
-- shim local de auth (bcrypt proprio). No Supabase real, o GoTrue ja faz
-- rate limiting de login nativamente — o app deve parar de usar
-- signInWithPassword() customizado e chamar @supabase/supabase-js em vez
-- disso (ver CUTOVER.md). Se algum dia voltar a precisar de throttling
-- proprio, recrie a tabela manualmente.


-- -----------------------------------------------------------------------------
-- 4. Funcoes SECURITY DEFINER (leem o usuario ao vivo, nao um JWT desatualizado)
-- -----------------------------------------------------------------------------
-- auth.uid() ja existe nativamente no Supabase — não precisa ser criada.
--
-- current_condominio_id() e current_usuario_role() consultam
-- sisencomendas.usuarios a cada chamada usando so auth.uid() (identidade)
-- como entrada confiavel: uma mudanca de role/condominio feita pelo admin
-- vale imediatamente, sem esperar o JWT expirar.
--
-- SECURITY DEFINER roda com o privilegio de quem criou a funcao (normalmente
-- "postgres", dono das tabelas no SQL Editor do Supabase), entao a consulta
-- interna ignora RLS — evita a dependencia circular com a policy de
-- usuarios.select. search_path fixo previne sequestro de search_path.
CREATE OR REPLACE FUNCTION sisencomendas.current_condominio_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = sisencomendas, pg_temp
AS $$
  SELECT condominio_id FROM sisencomendas.usuarios WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION sisencomendas.current_usuario_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = sisencomendas, pg_temp
AS $$
  SELECT role::text FROM sisencomendas.usuarios WHERE id = auth.uid()
$$;


-- -----------------------------------------------------------------------------
-- 5. RLS policies (identicas as locais, trocando o role de destino para
--    "authenticated" — o role nativo que o Supabase usa para qualquer usuario
--    logado via Supabase Auth; nao existe "sisencomendas_app" em producao).
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY condominios_select_own ON sisencomendas.condominios
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (id = sisencomendas.current_condominio_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY condominios_update_admin ON sisencomendas.condominios
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING (id = sisencomendas.current_condominio_id() AND sisencomendas.current_usuario_role() = 'desenvolvedor')
    WITH CHECK (id = sisencomendas.current_condominio_id() AND sisencomendas.current_usuario_role() = 'desenvolvedor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY usuarios_select_tenant ON sisencomendas.usuarios
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (condominio_id = sisencomendas.current_condominio_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY usuarios_insert_admin ON sisencomendas.usuarios
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (condominio_id = sisencomendas.current_condominio_id() AND sisencomendas.current_usuario_role() = 'desenvolvedor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY usuarios_update_admin ON sisencomendas.usuarios
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING (condominio_id = sisencomendas.current_condominio_id() AND sisencomendas.current_usuario_role() = 'desenvolvedor')
    WITH CHECK (condominio_id = sisencomendas.current_condominio_id() AND sisencomendas.current_usuario_role() = 'desenvolvedor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY usuarios_delete_admin ON sisencomendas.usuarios
    AS PERMISSIVE FOR DELETE TO authenticated
    USING (condominio_id = sisencomendas.current_condominio_id() AND sisencomendas.current_usuario_role() = 'desenvolvedor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY moradores_select_tenant ON sisencomendas.moradores
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (condominio_id = sisencomendas.current_condominio_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY moradores_insert_tenant ON sisencomendas.moradores
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (condominio_id = sisencomendas.current_condominio_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY moradores_update_admin ON sisencomendas.moradores
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING (condominio_id = sisencomendas.current_condominio_id() AND sisencomendas.current_usuario_role() IN ('desenvolvedor', 'administracao'))
    WITH CHECK (condominio_id = sisencomendas.current_condominio_id() AND sisencomendas.current_usuario_role() IN ('desenvolvedor', 'administracao'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY moradores_delete_admin ON sisencomendas.moradores
    AS PERMISSIVE FOR DELETE TO authenticated
    USING (condominio_id = sisencomendas.current_condominio_id() AND sisencomendas.current_usuario_role() IN ('desenvolvedor', 'administracao'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY remetentes_select_tenant ON sisencomendas.remetentes
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (condominio_id = sisencomendas.current_condominio_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY remetentes_insert_tenant ON sisencomendas.remetentes
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (condominio_id = sisencomendas.current_condominio_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY transportadoras_select_tenant ON sisencomendas.transportadoras
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (condominio_id = sisencomendas.current_condominio_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY transportadoras_insert_tenant ON sisencomendas.transportadoras
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (condominio_id = sisencomendas.current_condominio_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Remover nomes cadastrados errados (migracao 0023). Sem UPDATE.
DO $$ BEGIN
  CREATE POLICY transportadoras_delete_tenant ON sisencomendas.transportadoras
    AS PERMISSIVE FOR DELETE TO authenticated
    USING (condominio_id = sisencomendas.current_condominio_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY encomendas_select_tenant ON sisencomendas.encomendas
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (condominio_id = sisencomendas.current_condominio_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY encomendas_insert_tenant ON sisencomendas.encomendas
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (condominio_id = sisencomendas.current_condominio_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY encomendas_update_tenant ON sisencomendas.encomendas
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING (condominio_id = sisencomendas.current_condominio_id())
    WITH CHECK (condominio_id = sisencomendas.current_condominio_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Historico permanente por padrao: so desenvolvedor/administracao podem
-- excluir, e so encomendas ja entregues (nunca pendentes) — pensado para
-- limpar testes/lancamentos errados, nao para uso rotineiro.
DO $$ BEGIN
  CREATE POLICY encomendas_delete_desenvolvedor ON sisencomendas.encomendas
    AS PERMISSIVE FOR DELETE TO authenticated
    USING (condominio_id = sisencomendas.current_condominio_id() AND status = 'entregue' AND sisencomendas.current_usuario_role() IN ('desenvolvedor', 'administracao'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY log_atividade_select_desenvolvedor ON sisencomendas.log_atividade
    AS PERMISSIVE FOR SELECT TO authenticated
    USING (condominio_id = sisencomendas.current_condominio_id() AND sisencomendas.current_usuario_role() = 'desenvolvedor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY log_atividade_insert_tenant ON sisencomendas.log_atividade
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK (condominio_id = sisencomendas.current_condominio_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- -----------------------------------------------------------------------------
-- 6. Grants para o role "authenticated" (equivalente ao sisencomendas_app local)
-- -----------------------------------------------------------------------------
-- Nao concedemos nada em auth.users: com o Supabase Auth real, a aplicacao
-- nunca insere/le auth.users diretamente — isso e feito pela API de Auth do
-- Supabase (GoTrue), nao por SQL direto do app.
GRANT USAGE ON SCHEMA sisencomendas TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  sisencomendas.condominios,
  sisencomendas.usuarios,
  sisencomendas.moradores,
  sisencomendas.encomendas
  TO authenticated;

-- Sem UPDATE/DELETE de proposito: auditoria imutavel (ver comentario na
-- criacao da tabela, secao 3).
GRANT SELECT, INSERT ON sisencomendas.log_atividade TO authenticated;

-- Sem UPDATE/DELETE: uma vez cadastrado, um remetente fica disponivel pra
-- sempre (nao ha tela de edicao/exclusao por enquanto).
GRANT SELECT, INSERT ON sisencomendas.remetentes TO authenticated;

-- Sem UPDATE; DELETE para limpar nomes errados (0023). REVOKE explicito
-- porque o Supabase concede privilegios padrao a anon/PUBLIC em tabelas novas.
REVOKE ALL ON sisencomendas.transportadoras FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON sisencomendas.transportadoras TO authenticated;

GRANT EXECUTE ON FUNCTION sisencomendas.current_condominio_id() TO authenticated;
GRANT EXECUTE ON FUNCTION sisencomendas.current_usuario_role() TO authenticated;


-- -----------------------------------------------------------------------------
-- 7. Realtime (telas atualizam sozinhas quando alguem registra/entrega uma
--    encomenda, sem precisar dar F5). A publicacao "supabase_realtime" ja
--    existe no projeto (usada por outros apps) — so adicionamos nossa
--    tabela nela, sem tocar nas entradas de ninguem.
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE sisencomendas.encomendas;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- Fim do script. Nenhuma tabela/função/policy de outro app foi tocada —
-- tudo o que foi criado vive dentro do schema "sisencomendas".
-- Proximo passo: CUTOVER.md nesta pasta.
-- =============================================================================
