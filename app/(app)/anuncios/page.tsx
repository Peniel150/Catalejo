import type { Metadata } from "next";
import { getSavedAds, getToday } from "@/lib/data.ts";
import { DemoNotice, EmptyState, PageHeader } from "@/components/ui.tsx";
import { AdCard } from "@/components/ads.tsx";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anuncios guardados" };

export default async function SavedAdsPage() {
  const [saved, today] = await Promise.all([getSavedAds(), getToday()]);
  return (
    <>
      <PageHeader title="Anuncios guardados" sub="Tu tablero de referencias: anuncios que te sirvieron de inspiración, con tus notas." />
      <DemoNotice />
      {saved.length === 0 ? (
        <EmptyState title="Aún no guardas anuncios" body="En la biblioteca de anuncios, con la extensión activa, toca “Guardar” sobre un anuncio." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {saved.map((s) => (
            <div key={s.adId}>
              <AdCard ad={s.ad} today={today} note={s.note} />
              <p className="mt-1 px-1 text-xs text-text-muted">{s.productName ?? s.competitorName ?? ""} · guardado {s.savedAt}</p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-text-muted">Los creativos pertenecen a sus anunciantes. Úsalos como referencia, no los copies.</p>
    </>
  );
}
