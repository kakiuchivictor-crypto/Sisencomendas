ALTER TABLE "sisencomendas"."encomendas" ALTER COLUMN "tipo" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "sisencomendas"."tipo_encomenda";--> statement-breakpoint
CREATE TYPE "sisencomendas"."tipo_encomenda" AS ENUM('caixa', 'pacote', 'envelope', 'documento', 'medicamento', 'carta', 'outros');--> statement-breakpoint
ALTER TABLE "sisencomendas"."encomendas" ALTER COLUMN "tipo" SET DATA TYPE "sisencomendas"."tipo_encomenda" USING "tipo"::"sisencomendas"."tipo_encomenda";