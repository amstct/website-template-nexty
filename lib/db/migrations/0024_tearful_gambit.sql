-- Step 1: Add pricing_plans site_id index (was in deleted 0023)
CREATE INDEX "idx_pricing_plans_site_id" ON "pricing_plans" USING btree ("site_id");
--> statement-breakpoint

-- Step 2: Drop old constraints on pricing_plan_groups
ALTER TABLE "pricing_plan_groups" DROP CONSTRAINT "pricing_plan_groups_slug_site_unique";
--> statement-breakpoint

-- Step 3: Drop old FK from pricing_plans to pricing_plan_groups
ALTER TABLE "pricing_plans" DROP CONSTRAINT "pricing_plans_group_slug_pricing_plan_groups_slug_fk";
--> statement-breakpoint

-- Step 4: Drop old single-column PK (name is auto-generated, typically "pricing_plan_groups_pkey")
ALTER TABLE "pricing_plan_groups" DROP CONSTRAINT IF EXISTS "pricing_plan_groups_pkey";
--> statement-breakpoint

-- Step 5: site_id becomes NOT NULL (required for composite PK)
ALTER TABLE "pricing_plan_groups" ALTER COLUMN "site_id" SET NOT NULL;
--> statement-breakpoint

-- Step 6: New composite PK (slug, site_id)
ALTER TABLE "pricing_plan_groups" ADD CONSTRAINT "pricing_plan_groups_slug_site_id_pk" PRIMARY KEY("slug","site_id");
--> statement-breakpoint

-- Step 7: Composite FK from pricing_plans to pricing_plan_groups
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_group_fk" FOREIGN KEY ("group_slug","site_id") REFERENCES "public"."pricing_plan_groups"("slug","site_id") ON DELETE restrict ON UPDATE no action;
