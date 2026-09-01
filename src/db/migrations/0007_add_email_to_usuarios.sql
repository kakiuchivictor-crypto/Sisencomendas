ALTER TABLE "sisencomendas"."usuarios" ADD COLUMN "email" text;--> statement-breakpoint
UPDATE "sisencomendas"."usuarios" u SET "email" = au.email FROM "auth"."users" au WHERE au.id = u.id;--> statement-breakpoint
ALTER TABLE "sisencomendas"."usuarios" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sisencomendas"."usuarios" ADD CONSTRAINT "usuarios_email_unique" UNIQUE("email");