CREATE TABLE "sisencomendas"."remetentes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominio_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sisencomendas"."remetentes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sisencomendas"."encomendas" ALTER COLUMN "transportadora" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sisencomendas"."encomendas" ADD COLUMN "remetente_id" uuid;--> statement-breakpoint
ALTER TABLE "sisencomendas"."remetentes" ADD CONSTRAINT "remetentes_condominio_id_condominios_id_fk" FOREIGN KEY ("condominio_id") REFERENCES "sisencomendas"."condominios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "remetentes_condominio_nome_idx" ON "sisencomendas"."remetentes" USING btree ("condominio_id","nome");--> statement-breakpoint
ALTER TABLE "sisencomendas"."encomendas" ADD CONSTRAINT "encomendas_remetente_id_remetentes_id_fk" FOREIGN KEY ("remetente_id") REFERENCES "sisencomendas"."remetentes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "remetentes_select_tenant" ON "sisencomendas"."remetentes" AS PERMISSIVE FOR SELECT TO "sisencomendas_app" USING (condominio_id = sisencomendas.current_condominio_id());--> statement-breakpoint
CREATE POLICY "remetentes_insert_tenant" ON "sisencomendas"."remetentes" AS PERMISSIVE FOR INSERT TO "sisencomendas_app" WITH CHECK (condominio_id = sisencomendas.current_condominio_id());--> statement-breakpoint
GRANT SELECT, INSERT ON "sisencomendas"."remetentes" TO "sisencomendas_app";