// Planes de Catalejo. Precios en pesos chilenos y límites por plan (confirmar IVA con contador).
// Los montos reales que se cobran vienen de variables de entorno (Mercado Pago); estos son los que se muestran.

export type PlanId = "free" | "basic" | "advanced";
export type Period = "monthly" | "yearly";

export interface Plan {
  id: PlanId;
  name: string;
  forWho: string;
  monthly: number; // CLP
  yearly: number; // CLP (2 meses gratis)
  limits: {
    radarRows: number | null; // null = sin límite
    follows: number | null;
    competitors: number | null;
    importOrders: boolean;
    supplierScores: boolean;
    alerts: boolean;
    historyDays: number;
  };
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Gratis",
    forWho: "Para conocer Catalejo",
    monthly: 0,
    yearly: 0,
    limits: { radarRows: 10, follows: 3, competitors: 1, importOrders: false, supplierScores: false, alerts: false, historyDays: 7 },
    features: [
      "Los 10 productos con mejor puntaje del radar",
      "Extensión de Chrome sin límite en tu navegador",
      "Calculadora de contra entrega y ROI",
      "Seguir 3 productos y 1 competidor",
    ],
  },
  basic: {
    id: "basic",
    name: "Básico",
    forWho: "Para tu primera tienda",
    monthly: 9990,
    yearly: 99900,
    limits: { radarRows: null, follows: 25, competitors: 5, importOrders: true, supplierScores: true, alerts: false, historyDays: 30 },
    features: [
      "Radar completo con todos los filtros",
      "Entrega efectiva de cada proveedor",
      "Importar tus reportes de pedidos de Dropi",
      "Historial de 30 días",
      "Seguir 25 productos y 5 competidores",
    ],
  },
  advanced: {
    id: "advanced",
    name: "Pro",
    forWho: "Para escalar y testear varios productos",
    monthly: 17990,
    yearly: 179900,
    limits: { radarRows: null, follows: null, competitors: null, importOrders: true, supplierScores: true, alerts: true, historyDays: 90 },
    features: [
      "Todo lo del plan Básico",
      "Alertas por correo: stock bajo, reposición y competidores que escalan",
      "Productos y competidores sin límite",
      "Historial de 90 días",
    ],
  },
};

export function planOf(sub: { plan?: string | null; status?: string | null; current_period_end?: string | Date | null } | null | undefined): PlanId {
  if (!sub || !sub.plan || sub.plan === "free") return "free";
  if (sub.status === "active" || sub.status === "trialing") return sub.plan as PlanId;
  // Cancelada: se mantiene el plan hasta el fin del período pagado.
  if (sub.status === "cancelled" && sub.current_period_end && new Date(sub.current_period_end) > new Date()) return sub.plan as PlanId;
  return "free";
}

export function canAdd(limit: number | null, current: number) {
  return limit === null || current < limit;
}
