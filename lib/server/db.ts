import "server-only";
import postgres from "postgres";
import { createHash, randomBytes } from "node:crypto";

// Conexión directa a Postgres de Supabase (cadena "Transaction pooler"). Solo en el servidor.
let _sql: postgres.Sql | null = null;
// DATABASE_URL (manual) o POSTGRES_URL (la crea la integración Supabase de Vercel; es el pooler).
function dbUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}
export function hasDatabase() {
  return !!dbUrl();
}
export function sql() {
  if (!_sql) {
    const url = dbUrl();
    if (!url) throw new Error("Falta DATABASE_URL");
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    _sql = postgres(url, { max: 5, prepare: false, idle_timeout: 20, ssl: local ? false : "require" });
  }
  return _sql;
}

/**
 * Ejecuta consultas COMO el usuario: rol "authenticated" y su id en los claims,
 * así las políticas RLS de Postgres filtran igual que en Supabase. Úsalo para toda lectura de la app.
 */
export async function asUser<T>(userId: string, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql().begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`;
    await tx`set local role authenticated`;
    return fn(tx);
  }) as Promise<T>;
}

/** Operaciones de sistema (webhooks, cron, ingesta validada). Sin RLS: cada llamada debe filtrar por usuario. */
export async function asService<T>(fn: (s: postgres.Sql) => Promise<T>): Promise<T> {
  return fn(sql());
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function newApiToken() {
  return "cat_" + randomBytes(32).toString("base64url");
}

/** Límite simple por clave y ventana (en memoria; en producción con varias instancias, usar Upstash/Redis). */
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  h.n++;
  return h.n <= max;
}
