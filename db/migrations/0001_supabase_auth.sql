DROP INDEX "users_tenant_clerk_user_idx";--> statement-breakpoint
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_clerk_org_id_unique";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN "clerk_org_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "clerk_user_id";--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_auth_user_idx" ON "users" USING btree ("tenant_id","auth_user_id");
