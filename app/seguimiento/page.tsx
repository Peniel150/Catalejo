import type { Metadata } from "next";
import { PageHeader } from "@/components/ui.tsx";
import { getRadar, getTrackedIds, isDemo } from "@/lib/data.ts";
import { toggleFollow } from "../radar/actions.ts";
import { FollowList, type FollowRow } from "./list.tsx";

export const metadata: Metadata = { title: "Seguimiento" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const [{ rows }, tracked, demo] = await Promise.all([getRadar(), getTrackedIds(), isDemo()]);
  const all: FollowRow[] = rows.map(({ product: p, score: s }) => ({
    id: p.id, name: p.name, category: p.category, score: s.score, units7: s.estUnits7d, growth: s.growth7d,
    stock: s.currentStock, restocked: s.restocked, delivery: s.supplierDeliveryRate, spark: s.daily.slice(-14).map((d) => d.units),
    stockLow: s.currentStock !== null && s.estUnits7d > 0 && s.currentStock < s.estUnits7d,
  }));
  return (
    <>
      <PageHeader title="Seguimiento" sub="Productos que sigues, con avisos de stock bajo, reposición y cambios de tendencia." />
      <FollowList rows={demo ? all : all.filter((r) => tracked.includes(r.id))} demo={demo} action={demo ? undefined : toggleFollow} />
    </>
  );
}
