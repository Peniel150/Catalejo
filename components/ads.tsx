import { ExternalLink, Film, Image as ImageIcon, Layers } from "lucide-react";
import type { Ad } from "@/lib/types.ts";
import { dayDiff } from "@/lib/score.ts";

const media = { video: { icon: Film, label: "Video" }, image: { icon: ImageIcon, label: "Imagen" }, carousel: { icon: Layers, label: "Carrusel" } };

export function AdCard({ ad, today, note }: { ad: Ad; today: string; note?: string }) {
  const days = dayDiff(ad.startedOn, today);
  const lv = days >= 30 ? "text-score-high bg-score-high-bg" : days >= 7 ? "text-score-mid bg-score-mid-bg" : "text-score-low bg-score-low-bg";
  const M = media[ad.mediaType];
  return (
    <article className="card overflow-hidden">
      <div className="grid h-30 place-items-center bg-surface-2 text-text-muted">
        <span className="flex items-center gap-2 text-xs"><M.icon size={16} aria-hidden="true" />{M.label}</span>
      </div>
      <div className="grid gap-2 p-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold" title={ad.pageName}>{ad.pageName}</h3>
          {ad.domain && <p className="truncate text-xs text-text-muted">{ad.domain}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`num rounded-full px-2 py-0.5 text-xs font-semibold ${lv}`}>{days} d activo</span>
          <span className="text-xs text-text-muted">{ad.platform === "meta" ? "Facebook · Instagram" : "TikTok"}</span>
        </div>
        {note && <p className="text-xs text-text-muted">“{note}”</p>}
        <a href={ad.libraryUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
          Ver en la biblioteca <ExternalLink size={12} aria-hidden="true" /><span className="sr-only"> (abre en otra pestaña)</span>
        </a>
      </div>
    </article>
  );
}
