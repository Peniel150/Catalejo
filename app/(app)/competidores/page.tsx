import Link from "next/link";
import type { Metadata } from "next";
import { getCompetitors } from "@/lib/data.ts";
import { DemoNotice, EmptyState, PageHeader } from "@/components/ui.tsx";
import { Sparkline } from "@/components/charts.tsx";
import { AddCompetitor } from "./add.tsx";
import { revalidatePath } from "next/cache";
import { asUser, hasDatabase } from "@/lib/server/db.ts";
import { currentUser } from "@/lib/supabase/server.ts";
import { getPlan } from "@/lib/data.ts";
import { PLANS, canAdd } from "@/lib/plans.ts";

async function addCompetitor(fd: FormData) {
  "use server";
  const u = await currentUser();
  if (!u) return;
  const raw = String(fd.get("target") ?? "").trim().slice(0, 200);
  if (!raw) return;
  const tiktok = raw.startsWith("@") ? raw.slice(1) : null;
  const domain = !tiktok && /\./.test(raw) && !/facebook\.com/i.test(raw) ? raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase() : null;
  const fbMatch = raw.match(/facebook\.com\/(?:profile\.php\?id=(\d+)|([^/?#]+))/i);
  const pageName = fbMatch?.[2] ?? null;
  const pageId = fbMatch?.[1] ?? null;
  const name = tiktok ?? domain ?? pageName ?? raw;
  const limit = PLANS[await getPlan()].limits.competitors;
  const [{ n }] = await asUser(u.id, (tx) => tx`select count(*)::int as n from competitors`);
  if (!canAdd(limit, n)) throw new Error(`Tu plan permite seguir ${limit} competidor(es).`);
  await asUser(u.id, (tx) => tx`insert into competitors (user_id, name, domain, tiktok_handle, facebook_page_id, facebook_page_name)
    values (${u.id}, ${name}, ${domain}, ${tiktok}, ${pageId}, ${pageName ?? (domain || tiktok ? null : raw)})`);
  revalidatePath("/competidores");
}

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Competidores" };

export default async function CompetitorsPage() {
  const list = await getCompetitors();
  return (
    <>
      <PageHeader title="Competidores" sub="Sigue sus anuncios: cuántos tienen activos, cuándo lanzan nuevos y qué productos empujan." />
      <DemoNotice />
      <AddCompetitor action={hasDatabase() && (await currentUser()) ? addCompetitor : undefined} />
      {list.length === 0 ? (
        <EmptyState title="Aún no sigues a ningún competidor" body="Agrega la página de Facebook, el dominio o la cuenta de TikTok de una tienda que te interese." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => {
            const last = c.snapshots.at(-1);
            const week = c.snapshots.slice(-7).reduce((s, x) => s + x.newAds, 0);
            return (
              <li key={c.id} className="card p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/competidores/${c.id}`} className="font-semibold hover:text-accent">{c.name}</Link>
                    <p className="truncate text-xs text-text-muted">{c.domain} · {c.facebookPageName}</p>
                  </div>
                  <Sparkline values={c.snapshots.slice(-14).map((s) => s.activeAds)} label={`Anuncios activos de ${c.name}, últimas 2 semanas`} />
                </div>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div><dt className="text-text-muted">Activos</dt><dd className="num text-lg font-semibold">{last?.activeAds ?? "—"}</dd></div>
                  <div><dt className="text-text-muted">Nuevos 7d</dt><dd className={`num text-lg font-semibold ${week > 0 ? "text-success" : ""}`}>{week}</dd></div>
                  <div><dt className="text-text-muted">Último dato</dt><dd className="num">{last?.day.slice(5) ?? "—"}</dd></div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
