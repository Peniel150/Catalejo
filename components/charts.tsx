// Gráficos SVG sin librerías. Cada uno trae una tabla equivalente para lectores de pantalla.

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const w = 56, h = 20;
  if (values.length < 2) return <span className="text-xs text-text-muted">—</span>;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * (h - 2) - 1}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="shrink-0">
      <polyline points={pts} fill="none" stroke="var(--c-accent)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function BarLineChart({ data, height = 180 }: { data: { day: string; units: number; stock: number | null; restock: boolean }[]; height?: number }) {
  if (data.length < 2) return <p className="text-text-muted">Aún no hay suficientes observaciones. La curva aparece después de 2 días.</p>;
  const w = 720, h = height, pad = 24;
  const maxU = Math.max(...data.map((d) => d.units), 1);
  const stocks = data.map((d) => d.stock).filter((s): s is number => s !== null);
  const maxS = Math.max(...stocks, 1);
  const bw = (w - pad * 2) / data.length;
  const stockPts = data.map((d, i) => (d.stock === null ? null : `${pad + i * bw + bw / 2},${h - pad - (d.stock / maxS) * (h - pad * 2)}`)).filter(Boolean).join(" ");
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Ventas estimadas por día (barras) y stock observado (línea)">
        <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="var(--c-border)" />
        {data.map((d, i) => {
          const bh = (d.units / maxU) * (h - pad * 2);
          return (
            <g key={d.day}>
              <rect x={pad + i * bw + 1} y={h - pad - bh} width={Math.max(1, bw - 2)} height={bh} fill="var(--c-accent)" opacity="0.75" rx="1.5" />
              {d.restock && <circle cx={pad + i * bw + bw / 2} cy={pad / 2 + 2} r="4" fill="var(--c-warning)" />}
            </g>
          );
        })}
        <polyline points={stockPts} fill="none" stroke="var(--c-text-muted)" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x={pad} y={h - 6} fontSize="11" fill="var(--c-text-muted)">{data[0].day}</text>
        <text x={w - pad} y={h - 6} fontSize="11" fill="var(--c-text-muted)" textAnchor="end">{data[data.length - 1].day}</text>
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-text-muted">
        <span><span className="mr-1 inline-block h-2 w-3 rounded-sm bg-accent align-middle" />Ventas estimadas por día</span>
        <span><span className="mr-1 inline-block w-4 border-t-2 border-dashed border-text-muted align-middle" />Stock observado</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-warning align-middle" />Reposición de stock</span>
      </figcaption>
      <table className="sr-only">
        <caption>Ventas estimadas y stock por día</caption>
        <thead><tr><th>Día</th><th>Ventas</th><th>Stock</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.day}><td>{d.day}</td><td>{d.units}</td><td>{d.stock ?? "sin dato"}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

export function StepChart({ data }: { data: { day: string; activeAds: number; newAds: number }[] }) {
  if (data.length < 2) return <p className="text-text-muted">Abre la biblioteca de anuncios de este competidor para empezar su historial.</p>;
  const w = 720, h = 160, pad = 24;
  const max = Math.max(...data.map((d) => d.activeAds), 1);
  const x = (i: number) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const pts = data.map((d, i) => `${x(i)},${y(d.activeAds)}`).join(" ");
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Anuncios activos por día">
        <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="var(--c-border)" />
        <polyline points={pts} fill="none" stroke="var(--c-accent)" strokeWidth="2" />
        {data.map((d, i) => d.newAds > 0 && <circle key={d.day} cx={x(i)} cy={y(d.activeAds)} r="3.5" fill="var(--c-warning)" />)}
        <text x={pad} y={h - 6} fontSize="11" fill="var(--c-text-muted)">{data[0].day}</text>
        <text x={w - pad} y={h - 6} fontSize="11" fill="var(--c-text-muted)" textAnchor="end">{data[data.length - 1].day}</text>
      </svg>
      <figcaption className="mt-2 text-xs text-text-muted"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-warning align-middle" />Días con anuncios nuevos</figcaption>
      <table className="sr-only">
        <caption>Anuncios activos por día</caption>
        <tbody>{data.map((d) => <tr key={d.day}><td>{d.day}</td><td>{d.activeAds} activos</td><td>{d.newAds} nuevos</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
