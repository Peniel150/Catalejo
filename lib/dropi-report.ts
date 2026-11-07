// Lector del reporte de pedidos que el usuario descarga desde su cuenta de Dropi.
// Reconoce las columnas por nombre (con sinónimos), no por posición, porque el formato puede cambiar.
// NUNCA extrae nombre, teléfono, dirección, email ni documento del cliente: solo las columnas mapeadas abajo.
//
// Pendiente: confirmar los encabezados con un reporte real de Dropi Chile.

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "returned" | "cancelled";

export interface ParsedOrder {
  externalId: string;
  placedAt: string; // ISO
  status: OrderStatus;
  supplierName: string | null;
  productTitle: string | null;
  sku: string | null;
  quantity: number;
  total: number;
  freight: number | null;
  region: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
}

export interface ParseResult {
  orders: ParsedOrder[];
  errors: { row: number; message: string }[];
  mapping: Record<string, string | null>; // campo -> encabezado encontrado
  ignoredColumns: string[]; // columnas que no se leen (incluye las de datos personales)
}

const FIELDS: Record<string, string[]> = {
  externalId: ["id", "id orden", "id pedido", "numero de orden", "n° orden", "orden", "pedido"],
  placedAt: ["fecha", "fecha de creacion", "fecha creacion", "fecha orden", "fecha pedido", "creado"],
  status: ["estatus", "estado", "estado orden", "status"],
  supplierName: ["proveedor", "nombre proveedor", "tienda proveedor", "bodega proveedor"],
  productTitle: ["producto", "nombre producto", "productos", "producto(s)"],
  sku: ["sku", "codigo producto", "id producto"],
  quantity: ["cantidad", "unidades", "cant"],
  total: ["total", "valor total", "total orden", "valor", "precio total", "total a cobrar", "valor a recaudar"],
  freight: ["flete", "valor flete", "precio flete", "costo envio", "costo de envio"],
  region: ["region", "región", "departamento", "region destino", "departamento destino", "estado destino"],
  dispatchedAt: ["fecha despacho", "fecha de despacho", "fecha guia", "fecha generacion guia"],
  deliveredAt: ["fecha entrega", "fecha de entrega"],
};

// Columnas que jamás se leen aunque existan (datos personales del cliente final).
const PII = /nombre cliente|cliente|tel[eé]fono|celular|direcci[oó]n|email|correo|c[eé]dula|rut|documento|dni|notas?/i;

export function normalizeHeader(h: string): string {
  return h.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();
}

export function mapStatus(raw: string): OrderStatus | null {
  const s = normalizeHeader(raw);
  if (!s) return null;
  if (/entregad/.test(s)) return "delivered";
  if (/devol|devuelt|rechaz/.test(s)) return "returned";
  if (/cancel|anulad/.test(s)) return "cancelled";
  if (/transit|despach|guia|enviad|reparto|bodega transport|novedad/.test(s)) return "shipped";
  if (/confirm/.test(s)) return "confirmed";
  if (/pendient|nuev|preparac/.test(s)) return "pending";
  return null;
}

function parseMoney(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Math.round(v);
  const s = String(v).replace(/[^\d,.-]/g, "");
  // Chile: punto de miles, coma decimal
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function parseDateCL(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString();
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) {
    const [, d, mo, y, h = "12", mi = "00"] = m;
    // Hora de Chile aproximada (UTC-3). La agregación diaria usa America/Santiago.
    return new Date(Date.UTC(+y, +mo - 1, +d, +h + 3, +mi)).toISOString();
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (m) {
    const [, y, mo, d, h = "12", mi = "00"] = m;
    return new Date(Date.UTC(+y, +mo - 1, +d, +h + 3, +mi)).toISOString();
  }
  return null;
}

/** rows[0] = encabezados. Acepta celdas string, number o Date (CSV o Excel). */
export function parseDropiReport(rows: unknown[][]): ParseResult {
  const errors: ParseResult["errors"] = [];
  if (!rows.length) return { orders: [], errors: [{ row: 0, message: "El archivo está vacío." }], mapping: {}, ignoredColumns: [] };
  const headers = rows[0].map((h) => normalizeHeader(String(h ?? "")));
  const mapping: Record<string, string | null> = {};
  const idx: Record<string, number> = {};
  for (const [field, syns] of Object.entries(FIELDS)) {
    const i = headers.findIndex((h) => syns.includes(h) && !(field !== "region" && PII.test(h)));
    idx[field] = i;
    mapping[field] = i >= 0 ? String(rows[0][i]) : null;
  }
  const used = new Set(Object.values(idx).filter((i) => i >= 0));
  const ignoredColumns = rows[0].map(String).filter((_, i) => !used.has(i));

  const missing = ["externalId", "placedAt", "status"].filter((f) => idx[f] < 0);
  if (missing.length) {
    return { orders: [], errors: [{ row: 1, message: `No encontramos las columnas: ${missing.join(", ")}. Revisa que sea el reporte de pedidos de Dropi.` }], mapping, ignoredColumns };
  }

  const orders: ParsedOrder[] = [];
  const seen = new Set<string>();
  rows.slice(1).forEach((r, k) => {
    const rowN = k + 2;
    const get = (f: string) => (idx[f] >= 0 ? r[idx[f]] : undefined);
    const externalId = String(get("externalId") ?? "").trim();
    if (!externalId) return; // filas vacías
    if (seen.has(externalId)) return; // una orden con varias líneas: se cuenta una vez
    const placedAt = parseDateCL(get("placedAt"));
    const status = mapStatus(String(get("status") ?? ""));
    if (!placedAt) return void errors.push({ row: rowN, message: "Fecha no reconocida." });
    if (!status) return void errors.push({ row: rowN, message: `Estado no reconocido: “${String(get("status") ?? "").slice(0, 40)}”.` });
    seen.add(externalId);
    orders.push({
      externalId,
      placedAt,
      status,
      supplierName: (get("supplierName") as string)?.toString().trim() || null,
      productTitle: (get("productTitle") as string)?.toString().trim().slice(0, 200) || null,
      sku: (get("sku") as string)?.toString().trim() || null,
      quantity: Math.max(1, parseMoney(get("quantity")) ?? 1),
      total: parseMoney(get("total")) ?? 0,
      freight: parseMoney(get("freight")),
      region: (get("region") as string)?.toString().trim() || null,
      dispatchedAt: parseDateCL(get("dispatchedAt")),
      deliveredAt: parseDateCL(get("deliveredAt")),
    });
  });
  return { orders, errors, mapping, ignoredColumns };
}

/** CSV simple con comillas, separador , o ; (Excel en español suele exportar con ;). */
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const out: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); out.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out.filter((r) => r.some((x) => x.trim() !== ""));
}
