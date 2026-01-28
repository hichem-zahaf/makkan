/**
 * Migration Script: Migrate filesystem documents to SQLite
 *
 * Usage:
 *   npx tsx scripts/migrate-to-sqlite.ts
 *
 * Options:
 *   --quick   Quick sync (only modified documents)
 *   --force   Force full re-sync (clear and rebuild database)
 */

import { syncAllDocuments, quickSync } from '../services/sync-service';
import { deleteDatabase, databaseExists } from '../lib/db/database';
import { closeDatabase } from '../lib/db/database';

async function main() {
  const args = process.argv.slice(2);
  const isQuick = args.includes('--quick');
  const isForce = args.includes('--force');

  console.log('🗄️  MAKKAN SQLite Migration');
  console.log('');

  if (isForce && databaseExists()) {
    console.log('⚠️  Force mode enabled - clearing existing database...');
    await deleteDatabase();
    console.log('✓ Database cleared');
    console.log('');
  }

  if (isQuick) {
    console.log('🔄 Running quick sync (only modified documents)...');
    const result = await quickSync();

    console.log('');
    console.log('✓ Quick sync complete!');
    console.log(`  Added:   ${result.added}`);
    console.log(`  Updated: ${result.updated}`);
    console.log(`  Time:    ${(result.duration / 1000).toFixed(2)}s`);

    if (result.errors.length > 0) {
      console.log('');
      console.log('⚠️  Errors:');
      for (const error of result.errors) {
        console.log(`  - ${error}`);
      }
    }
  } else {
    console.log('🔄 Running full sync...');
    console.log('   Scanning filesystem and syncing to SQLite...');
    console.log('');

    const result = await syncAllDocuments();

    console.log('');
    console.log('✓ Migration complete!');
    console.log(`  Added:    ${result.added}`);
    console.log(`  Updated:  ${result.updated}`);
    console.log(`  Removed:  ${result.removed}`);
    console.log(`  Time:     ${(result.duration / 1000).toFixed(2)}s`);

    if (result.errors.length > 0) {
      console.log('');
      console.log('⚠️  Errors:');
      for (const error of result.errors) {
        console.log(`  - ${error}`);
      }
    }
  }

  // Show database stats
  const { getDatabaseStats } = require('../lib/db/database');
  const stats = getDatabaseStats();

  console.log('');
  console.log('📊 Database Statistics:');
  console.log(`  Documents:  ${stats.documentCount}`);
  console.log(`  Authors:    ${stats.authorCount}`);
  console.log(`  Categories: ${stats.categoryCount}`);
  console.log(`  Tags:       ${stats.tagCount}`);
  console.log(`  Libraries:  ${stats.libraryCount}`);
  console.log(`  DB Size:    ${(stats.dbSize / 1024).toFixed(2)} KB`);

  closeDatabase();
}

main().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
