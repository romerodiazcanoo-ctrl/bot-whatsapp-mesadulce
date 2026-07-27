import path from "node:path";
import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

function resolveDatabaseUrl() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const filePath = url.replace(/^file:/, "");
  if (path.isAbsolute(filePath)) return url;
  return `file:${path.join(/* turbopackIgnore: true */ process.cwd(), filePath)}`;
}

/**
 * Next.js runs proxy/route-handler/server-action code in separate module
 * realms in dev, so this app ends up with more than one connection to the
 * same SQLite file. WAL mode (persisted in the file itself) lets those
 * connections read concurrently instead of hitting SQLITE_BUSY while a
 * write transaction is open.
 */
function ensureWalMode(url: string) {
  const filePath = url.replace(/^file:/, "");
  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.close();
}

function createPrismaClient() {
  const url = resolveDatabaseUrl();
  ensureWalMode(url);
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
