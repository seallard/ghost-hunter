import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Migrations applied");
  } catch (err) {
    console.error("Migration failed", err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
