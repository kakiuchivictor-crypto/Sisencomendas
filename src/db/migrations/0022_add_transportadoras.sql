CREATE TABLE "sisencomendas"."transportadoras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominio_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transportadoras_nome_valido" CHECK (nome = btrim(nome) AND char_length(nome) BETWEEN 1 AND 60)
);
--> statement-breakpoint
ALTER TABLE "sisencomendas"."transportadoras" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sisencomendas"."transportadoras" ADD CONSTRAINT "transportadoras_condominio_id_fkey" FOREIGN KEY ("condominio_id") REFERENCES "sisencomendas"."condominios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transportadoras_condominio_nome_idx" ON "sisencomendas"."transportadoras" USING btree ("condominio_id",lower("nome"));--> statement-breakpoint
CREATE POLICY "transportadoras_select_tenant" ON "sisencomendas"."transportadoras" AS PERMISSIVE FOR SELECT TO "sisencomendas_app" USING (condominio_id = sisencomendas.current_condominio_id());--> statement-breakpoint
CREATE POLICY "transportadoras_insert_tenant" ON "sisencomendas"."transportadoras" AS PERMISSIVE FOR INSERT TO "sisencomendas_app" WITH CHECK (condominio_id = sisencomendas.current_condominio_id());--> statement-breakpoint
REVOKE ALL ON "sisencomendas"."transportadoras" FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT ON "sisencomendas"."transportadoras" TO "sisencomendas_app";--> statement-breakpoint
COMMENT ON TABLE "sisencomendas"."transportadoras" IS 'Catalogo de nomes de transportadoras por condominio (sem FK a partir de encomendas). RLS por current_condominio_id(); sem UPDATE/DELETE para authenticated.';
