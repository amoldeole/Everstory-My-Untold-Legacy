import { activeDatabaseDescription, closeDb, getDb } from "../src/db";

async function main(): Promise<void> {
  console.log(`→ Applying migrations to ${activeDatabaseDescription()}`);
  await getDb();
  console.log("✓ Database is up to date");
  await closeDb();
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("✗ Migration failed");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
