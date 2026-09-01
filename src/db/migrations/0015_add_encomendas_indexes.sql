CREATE INDEX "encomendas_condominio_status_entregue_idx" ON "sisencomendas"."encomendas" USING btree ("condominio_id","status","entregue_em");--> statement-breakpoint
CREATE INDEX "encomendas_condominio_status_recebida_idx" ON "sisencomendas"."encomendas" USING btree ("condominio_id","status","recebida_em");--> statement-breakpoint
CREATE INDEX "encomendas_condominio_recebida_idx" ON "sisencomendas"."encomendas" USING btree ("condominio_id","recebida_em");--> statement-breakpoint
CREATE INDEX "encomendas_numero_trgm_idx" ON "sisencomendas"."encomendas" USING gin ("numero" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "encomendas_nota_fiscal_trgm_idx" ON "sisencomendas"."encomendas" USING gin ("nota_fiscal" gin_trgm_ops);