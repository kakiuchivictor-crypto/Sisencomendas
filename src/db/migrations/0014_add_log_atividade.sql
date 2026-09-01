CREATE TYPE "sisencomendas"."log_acao" AS ENUM('encomenda_criada', 'encomenda_entregue', 'encomenda_revertida', 'encomenda_excluida', 'correspondencia_criada', 'morador_criado', 'morador_atualizado', 'morador_excluido', 'usuario_criado', 'usuario_atualizado', 'usuario_excluido', 'configuracoes_atualizadas');--> statement-breakpoint
CREATE TABLE "sisencomendas"."log_atividade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominio_id" uuid NOT NULL,
	"usuario_id" uuid,
	"usuario_nome" text NOT NULL,
	"acao" "sisencomendas"."log_acao" NOT NULL,
	"descricao" text NOT NULL,
	"entidade_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sisencomendas"."log_atividade" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sisencomendas"."log_atividade" ADD CONSTRAINT "log_atividade_condominio_id_condominios_id_fk" FOREIGN KEY ("condominio_id") REFERENCES "sisencomendas"."condominios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sisencomendas"."log_atividade" ADD CONSTRAINT "log_atividade_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "sisencomendas"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "log_atividade_condominio_criado_idx" ON "sisencomendas"."log_atividade" USING btree ("condominio_id","created_at");--> statement-breakpoint
CREATE POLICY "log_atividade_select_desenvolvedor" ON "sisencomendas"."log_atividade" AS PERMISSIVE FOR SELECT TO "sisencomendas_app" USING (condominio_id = sisencomendas.current_condominio_id() and sisencomendas.current_usuario_role() = 'desenvolvedor');--> statement-breakpoint
CREATE POLICY "log_atividade_insert_tenant" ON "sisencomendas"."log_atividade" AS PERMISSIVE FOR INSERT TO "sisencomendas_app" WITH CHECK (condominio_id = sisencomendas.current_condominio_id());--> statement-breakpoint
-- Sem UPDATE/DELETE de proposito: auditoria imutavel (ver comentario no schema).
GRANT SELECT, INSERT ON "sisencomendas"."log_atividade" TO "sisencomendas_app";