import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export async function setup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set for tests");

  const parsed = new URL(url);
  const testDbName = parsed.pathname.slice(1);
  // Safety net: refuse to run against a non-_test database. Stops a misconfigured
  // env from migrating + truncating the dev database.
  if (!testDbName.endsWith("_test")) {
    throw new Error(
      `Tests require a *_test database (got: ${testDbName}). Refusing to run.`,
    );
  }

  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = postgres(adminUrl.toString(), { max: 1 });
  try {
    await admin.unsafe(`CREATE DATABASE "${testDbName}"`);
  } catch (err) {
    if (!String(err).includes("already exists")) throw err;
  } finally {
    await admin.end();
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
  } finally {
    await client.end();
  }
}
