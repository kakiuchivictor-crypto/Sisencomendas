CREATE POLICY "transportadoras_delete_tenant" ON "sisencomendas"."transportadoras" AS PERMISSIVE FOR DELETE TO "sisencomendas_app" USING (condominio_id = sisencomendas.current_condominio_id());--> statement-breakpoint
GRANT DELETE ON "sisencomendas"."transportadoras" TO "sisencomendas_app";--> statement-breakpoint
COMMENT ON TABLE "sisencomendas"."transportadoras" IS 'Catalogo de nomes de transportadoras por condominio (sem FK a partir de encomendas). RLS por current_condominio_id(); DELETE liberado no tenant, sem UPDATE.';
