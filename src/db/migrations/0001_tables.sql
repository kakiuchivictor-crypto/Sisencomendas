CREATE SCHEMA "sisencomendas";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "auth";
--> statement-breakpoint
-- Shim local do contrato do Supabase Auth: mesmo nome/assinatura das funcoes
-- que o Supabase expoe nativamente em producao (auth.uid()/auth.role()/
-- auth.jwt() ja vem prontas em qualquer projeto Supabase — nao serao
-- recriadas no script de deploy para o Supabase real, apenas aqui, no
-- ambiente local). Leem a GUC "request.jwt.claims", setada por
-- withTenantContext() a cada transacao, exatamente como o PostgREST faz.
CREATE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  )
$$;
--> statement-breakpoint
CREATE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT auth.jwt() ->> 'role'
$$;
--> statement-breakpoint
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT (auth.jwt() ->> 'sub')::uuid
$$;
--> statement-breakpoint
CREATE TYPE "sisencomendas"."encomenda_status" AS ENUM('pendente', 'entregue');--> statement-breakpoint
CREATE TYPE "sisencomendas"."tema" AS ENUM('claro', 'escuro');--> statement-breakpoint
CREATE TYPE "sisencomendas"."tipo_encomenda" AS ENUM('caixa', 'envelope', 'documento', 'comida', 'medicamento', 'outros');--> statement-breakpoint
CREATE TYPE "sisencomendas"."transportadora" AS ENUM('correios', 'mercado_livre', 'amazon', 'shopee', 'jadlog', 'loggi', 'total_express', 'fedex', 'ups', 'dhl', 'outros');--> statement-breakpoint
CREATE TYPE "sisencomendas"."usuario_role" AS ENUM('admin', 'porteiro');--> statement-breakpoint
CREATE TABLE "auth"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "sisencomendas"."condominios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"logo_url" text,
	"tema" "sisencomendas"."tema" DEFAULT 'claro' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sisencomendas"."condominios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sisencomendas"."usuarios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"condominio_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"role" "sisencomendas"."usuario_role" DEFAULT 'porteiro' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sisencomendas"."usuarios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sisencomendas"."moradores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominio_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"rua" text NOT NULL,
	"numero" text NOT NULL,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sisencomendas"."moradores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sisencomendas"."encomendas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominio_id" uuid NOT NULL,
	"morador_id" uuid NOT NULL,
	"rua" text NOT NULL,
	"numero" text NOT NULL,
	"transportadora" "sisencomendas"."transportadora" NOT NULL,
	"transportadora_outro" text,
	"tipo" "sisencomendas"."tipo_encomenda" NOT NULL,
	"quantidade" integer DEFAULT 1 NOT NULL,
	"codigo_rastreio" text,
	"nota_fiscal" text,
	"observacoes" text,
	"foto_url" text,
	"status" "sisencomendas"."encomenda_status" DEFAULT 'pendente' NOT NULL,
	"recebida_por" uuid NOT NULL,
	"recebida_em" timestamp with time zone DEFAULT now() NOT NULL,
	"entregue_por" uuid,
	"entregue_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "encomendas_quantidade_positive" CHECK ("sisencomendas"."encomendas"."quantidade" >= 1)
);
--> statement-breakpoint
ALTER TABLE "sisencomendas"."encomendas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sisencomendas"."login_throttle" (
	"email" text PRIMARY KEY NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"first_failed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "sisencomendas"."usuarios" ADD CONSTRAINT "usuarios_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sisencomendas"."usuarios" ADD CONSTRAINT "usuarios_condominio_id_condominios_id_fk" FOREIGN KEY ("condominio_id") REFERENCES "sisencomendas"."condominios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sisencomendas"."moradores" ADD CONSTRAINT "moradores_condominio_id_condominios_id_fk" FOREIGN KEY ("condominio_id") REFERENCES "sisencomendas"."condominios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sisencomendas"."encomendas" ADD CONSTRAINT "encomendas_condominio_id_condominios_id_fk" FOREIGN KEY ("condominio_id") REFERENCES "sisencomendas"."condominios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sisencomendas"."encomendas" ADD CONSTRAINT "encomendas_morador_id_moradores_id_fk" FOREIGN KEY ("morador_id") REFERENCES "sisencomendas"."moradores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sisencomendas"."encomendas" ADD CONSTRAINT "encomendas_recebida_por_usuarios_id_fk" FOREIGN KEY ("recebida_por") REFERENCES "sisencomendas"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sisencomendas"."encomendas" ADD CONSTRAINT "encomendas_entregue_por_usuarios_id_fk" FOREIGN KEY ("entregue_por") REFERENCES "sisencomendas"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usuarios_condominio_idx" ON "sisencomendas"."usuarios" USING btree ("condominio_id");--> statement-breakpoint
CREATE INDEX "moradores_condominio_idx" ON "sisencomendas"."moradores" USING btree ("condominio_id");--> statement-breakpoint
CREATE INDEX "moradores_nome_trgm_idx" ON "sisencomendas"."moradores" USING gin ("nome" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "moradores_rua_trgm_idx" ON "sisencomendas"."moradores" USING gin ("rua" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "encomendas_condominio_status_idx" ON "sisencomendas"."encomendas" USING btree ("condominio_id","status");--> statement-breakpoint
CREATE INDEX "encomendas_morador_idx" ON "sisencomendas"."encomendas" USING btree ("morador_id");--> statement-breakpoint
CREATE INDEX "encomendas_rua_trgm_idx" ON "sisencomendas"."encomendas" USING gin ("rua" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "encomendas_codigo_rastreio_trgm_idx" ON "sisencomendas"."encomendas" USING gin ("codigo_rastreio" gin_trgm_ops);