/**
 * Multi-site backfill script
 *
 * Usage: pnpm tsx lib/db/migrations/backfill-site.ts
 *
 * This script:
 * 1. Creates a default site record in the `sites` table
 * 2. Backfills `site_id` in all existing tables with the default site's id
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(connectionString);
const db = drizzle(client);

// All tables that have site_id column and need backfilling
const TABLES = [
  'user',
  'session',
  'account',
  'verification',
  'user_source',
  'pricing_plan_groups',
  'pricing_plans',
  'orders',
  'subscriptions',
  'usage',
  'credit_logs',
  'posts',
  'tags',
  'post_tags',
];

async function main() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'nexty';
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  console.log(`\n🚀 Multi-site backfill script`);
  console.log(`   Site name: ${siteName}`);
  console.log(`   Site URL:  ${siteUrl}\n`);

  // Step 1: Create default site (idempotent — uses ON CONFLICT to skip if exists)
  const siteResult = await db.execute(sql`
    INSERT INTO sites (id, name, url, description, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), ${siteName}, ${siteUrl}, 'Default site (auto-created by backfill script)', true, now(), now())
    ON CONFLICT (name) DO UPDATE SET updated_at = now()
    RETURNING id, name
  `);

  const siteId = siteResult[0].id;
  console.log(`✅ Default site: name="${siteName}", id=${siteId}\n`);

  // Step 2: Backfill all tables
  for (const tableName of TABLES) {
    try {
      const result = await db.execute(
        sql`UPDATE ${sql.identifier(tableName)} SET site_id = ${siteId} WHERE site_id IS NULL`
      );
      const count = (result as any).count ?? (result as any).rowCount ?? '?';
      console.log(`   ✅ ${tableName}: updated ${count} rows`);
    } catch (err: any) {
      console.error(`   ❌ ${tableName}: ${err.message}`);
    }
  }

  // Step 3: Verify — check for any remaining NULL site_id
  console.log('\n📋 Verification:');
  let allGood = true;
  for (const tableName of TABLES) {
    const result = await db.execute(
      sql`SELECT COUNT(*)::int as count FROM ${sql.identifier(tableName)} WHERE site_id IS NULL`
    );
    const nullCount = (result[0] as any).count;
    if (nullCount > 0) {
      console.log(
        `   ⚠️  ${tableName}: ${nullCount} rows still have NULL site_id`
      );
      allGood = false;
    } else {
      console.log(`   ✅ ${tableName}: all rows have site_id`);
    }
  }

  if (allGood) {
    console.log('\n🎉 All tables backfilled successfully!\n');
  } else {
    console.log(
      '\n⚠️  Some tables have unbackfilled rows. Check errors above.\n'
    );
  }

  await client.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
