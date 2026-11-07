import Link from "next/link";
import type { ReactNode } from "react";
import { deliveryLevel, fmtPct, scoreLevel } from "@/lib/format.ts";
import type { Saturation } from "@/lib/types.ts";

const tone = {
  high: "text-score-high bg-score-high-bg",
  mid: "text-score-mid bg-score-mid-bg",
  low: "text-score-low bg-score-low-bg",
  none: "text-text-muted bg-surface-2",
} as const;

export function ScoreBadge({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const lv = scoreLevel(score);
  const cls = size === "lg" ? "h-14 w-14 text-lg" : "h-6 min-w-10 px-2 text-xs";
  return (
    <span className={`num inline-grid place-items-center rounded-full font-semibold ${cls} ${tone[lv]}`} aria-label={`Puntaje ${score} de 100`}>
      {score}
    </span>
  );
}

export function DeliveryBadge({ rate }: { rate: number | null }) {
  const lv = deliveryLevel(rate);
  return (
    <span className={`num inline-grid h-6 place-items-center rounded-full px-2 text-xs font-semibold ${tone[lv]}`} aria-label={rate === null ? "Entrega sin datos suficientes" : `Entrega ${fmtPct(rate)}`}>
      {rate === null ? "s/d" : fmtPct(rate)}
    </span>
  );
}

export function SaturationText({ value }: { value: Saturation }) {
  const c = value === "baja" ? "text-success" : value === "media" ? "text-warning" : "text-danger";
  return <span className={`text-xs font-semibold capitalize ${c}`}>{value}</span>;
}

export function Growth({ g }: { g: number | null }) {
  if (g === null) return <span className="num text-xs text-success">nuevo</span>;
  const up = g >= 0;
  return <span className={`num text-xs ${up ? "text-success" : "text-danger"}`}>{up ? "+" : "−"}{Math.abs(Math.round(g * 100))}%</span>;
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
const btnCls: Record<BtnVariant, string> = {
  primary: "bg-accent text-on-accent font-semibold hover:opacity-90",
  secondary: "bg-surface-2 text-text hover:bg-border",
  ghost: "border border-border text-text hover:bg-surface",
  danger: "bg-danger text-on-accent font-semibold",
};
export function buttonClass(variant: BtnVariant = "secondary", size: "sm" | "md" = "md") {
  return `inline-flex items-center justify-center gap-2 rounded-md transition-colors ${size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm"} ${btnCls[variant]} disabled:opacity-50 disabled:cursor-not-allowed`;
}
export function ButtonLink({ href, children, variant = "secondary", size = "md", external }: { href: string; children: ReactNode; variant?: BtnVariant; size?: "sm" | "md"; external?: boolean }) {
  if (external) return <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass(variant, size)}>{children}<span className="sr-only"> (abre en otra pestaña)</span></a>;
  return <Link href={href} className={buttonClass(variant, size)}>{children}</Link>;
}

export function Stat({ label, value, hint, hintTone }: { label: string; value: ReactNode; hint?: ReactNode; hintTone?: "up" | "down" | "muted" }) {
  const t = hintTone === "up" ? "text-success" : hintTone === "down" ? "text-danger" : "text-text-muted";
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="label">{label}</div>
      <div className="num mt-1 text-xl font-semibold">{value}</div>
      {hint && <div className={`mt-1 text-xs ${t}`}>{hint}</div>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="max-w-md text-text-muted">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold">{title}</h1>
        {sub && <p className="mt-1 text-text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export async function DemoNotice() {
  const { isDemo } = await import("@/lib/data.ts");
  if (!(await isDemo())) return null;
  return (
    <p className="mb-4 rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-muted" role="note">
      Estás viendo <b className="text-text">datos de ejemplo</b>: productos, proveedores y anunciantes ficticios. Instala la extensión y recorre Dropi para ver datos reales.
    </p>
  );
}
