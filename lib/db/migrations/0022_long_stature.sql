CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sites_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_language_slug_post_type_unique";--> statement-breakpoint
ALTER TABLE "tags" DROP CONSTRAINT "tags_name_post_type_unique";--> statement-breakpoint
ALTER TABLE "usage" DROP CONSTRAINT "usage_user_id_unique";--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_email_unique";--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_stripe_customer_id_unique";--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "credit_logs" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "post_tags" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "pricing_plan_groups" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "pricing_plans" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "usage" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "user_source" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_logs" ADD CONSTRAINT "credit_logs_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_plan_groups" ADD CONSTRAINT "pricing_plan_groups_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage" ADD CONSTRAINT "usage_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_source" ADD CONSTRAINT "user_source_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification" ADD CONSTRAINT "verification_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_account_site_id" ON "account" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_credit_logs_site_id" ON "credit_logs" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_orders_site_id" ON "orders" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_post_tags_site_id" ON "post_tags" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_posts_site_id" ON "posts" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_pricing_plan_groups_site_id" ON "pricing_plan_groups" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_session_site_id" ON "session" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_site_id" ON "subscriptions" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_tags_site_id" ON "tags" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_usage_site_id" ON "usage" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_user_site_id" ON "user" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_user_source_site_id" ON "user_source" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_verification_site_id" ON "verification" USING btree ("site_id");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_site_language_slug_post_type_unique" UNIQUE("site_id","language","slug","post_type");--> statement-breakpoint
ALTER TABLE "pricing_plan_groups" ADD CONSTRAINT "pricing_plan_groups_slug_site_unique" UNIQUE("slug","site_id");--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_site_name_post_type_unique" UNIQUE("site_id","name","post_type");--> statement-breakpoint
ALTER TABLE "usage" ADD CONSTRAINT "usage_user_id_site_unique" UNIQUE("user_id","site_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_email_site_unique" UNIQUE("email","site_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_stripe_customer_site_unique" UNIQUE("stripe_customer_id","site_id");