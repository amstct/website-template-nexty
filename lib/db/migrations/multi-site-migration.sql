-- ============================================================
-- Multi-site Migration (0022 + 0024 merged)
-- Execute in Supabase SQL Editor or any PostgreSQL client
-- ============================================================

-- Step 1: Create sites table
CREATE TABLE IF NOT EXISTS "sites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "url" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sites_name_unique" UNIQUE("name")
);

-- Step 2: Drop old unique constraints (will be replaced with site-scoped ones)
ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_language_slug_post_type_unique";
ALTER TABLE "tags" DROP CONSTRAINT IF EXISTS "tags_name_post_type_unique";
ALTER TABLE "usage" DROP CONSTRAINT IF EXISTS "usage_user_id_unique";
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_email_unique";
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_stripe_customer_id_unique";

-- Step 3: Add site_id column to all tables (nullable for migration)
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "site_id" uuid;
ALTER TABLE "credit_logs" ADD COLUMN IF NOT EXISTS "site_id" uuid;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "site_id" uuid;
ALTER TABLE "post_tags" ADD COLUMN IF NOT EXISTS "site_id" uuid;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "site_id" uuid;
ALTER TABLE "pricing_plan_groups" ADD COLUMN IF NOT EXISTS "site_id" uuid;
ALTER TABLE "pricing_plans" ADD COLUMN IF NOT EXISTS "site_id" uuid;
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "site_id" uuid;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "site_id" uuid;
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "site_id" uuid;
ALTER TABLE "usage" ADD COLUMN IF NOT EXISTS "site_id" uuid;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "site_id" uuid;
ALTER TABLE "user_source" ADD COLUMN IF NOT EXISTS "site_id" uuid;
ALTER TABLE "verification" ADD COLUMN IF NOT EXISTS "site_id" uuid;

-- Step 4: Add foreign keys (site_id → sites.id)
DO $$ BEGIN
  ALTER TABLE "account" ADD CONSTRAINT "account_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "credit_logs" ADD CONSTRAINT "credit_logs_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "pricing_plan_groups" ADD CONSTRAINT "pricing_plan_groups_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "session" ADD CONSTRAINT "session_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "tags" ADD CONSTRAINT "tags_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "usage" ADD CONSTRAINT "usage_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "user" ADD CONSTRAINT "user_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "user_source" ADD CONSTRAINT "user_source_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE restrict ON UPDATE no action;
  ALTER TABLE "verification" ADD CONSTRAINT "verification_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 5: Create indexes on site_id
CREATE INDEX IF NOT EXISTS "idx_account_site_id" ON "account" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_credit_logs_site_id" ON "credit_logs" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_orders_site_id" ON "orders" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_post_tags_site_id" ON "post_tags" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_posts_site_id" ON "posts" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_pricing_plan_groups_site_id" ON "pricing_plan_groups" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_pricing_plans_site_id" ON "pricing_plans" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_session_site_id" ON "session" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_site_id" ON "subscriptions" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_tags_site_id" ON "tags" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_usage_site_id" ON "usage" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_user_site_id" ON "user" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_user_source_site_id" ON "user_source" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_verification_site_id" ON "verification" ("site_id");

-- Step 6: Add site-scoped unique constraints
ALTER TABLE "posts" ADD CONSTRAINT "posts_site_language_slug_post_type_unique" UNIQUE("site_id","language","slug","post_type");
ALTER TABLE "tags" ADD CONSTRAINT "tags_site_name_post_type_unique" UNIQUE("site_id","name","post_type");
ALTER TABLE "usage" ADD CONSTRAINT "usage_user_id_site_unique" UNIQUE("user_id","site_id");
ALTER TABLE "user" ADD CONSTRAINT "user_email_site_unique" UNIQUE("email","site_id");
ALTER TABLE "user" ADD CONSTRAINT "user_stripe_customer_site_unique" UNIQUE("stripe_customer_id","site_id");

-- Step 7: Fix pricing_plan_groups — composite PK (slug, site_id)
ALTER TABLE "pricing_plan_groups" DROP CONSTRAINT IF EXISTS "pricing_plan_groups_slug_site_unique";
ALTER TABLE "pricing_plans" DROP CONSTRAINT IF EXISTS "pricing_plans_group_slug_pricing_plan_groups_slug_fk";
ALTER TABLE "pricing_plan_groups" DROP CONSTRAINT IF EXISTS "pricing_plan_groups_pkey";
ALTER TABLE "pricing_plan_groups" ALTER COLUMN "site_id" SET NOT NULL;
ALTER TABLE "pricing_plan_groups" ADD CONSTRAINT "pricing_plan_groups_slug_site_id_pk" PRIMARY KEY("slug","site_id");

-- Step 8: Composite FK from pricing_plans to pricing_plan_groups
ALTER TABLE "pricing_plans" DROP CONSTRAINT IF EXISTS "pricing_plans_group_fk";
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_group_fk" FOREIGN KEY ("group_slug","site_id") REFERENCES "pricing_plan_groups"("slug","site_id") ON DELETE restrict ON UPDATE no action;

-- ============================================================
-- Done! After this, run the backfill script to populate site_id
-- ============================================================
