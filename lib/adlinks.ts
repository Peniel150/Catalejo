// Links a las bibliotecas públicas de anuncios, con la búsqueda prellenada.
// Solo arma URLs públicas: no consulta ninguna API ni descarga nada.

export function metaAdLibrarySearch(q: string, country = "CL"): string {
  const u = new URL("https://www.facebook.com/ads/library/");
  u.searchParams.set("active_status", "active");
  u.searchParams.set("ad_type", "all");
  u.searchParams.set("country", country);
  u.searchParams.set("q", q);
  u.searchParams.set("search_type", "keyword_unordered");
  u.searchParams.set("media_type", "all");
  return u.toString();
}

export function metaAdLibraryPage(pageId: string, country = "CL"): string {
  const u = new URL("https://www.facebook.com/ads/library/");
  u.searchParams.set("active_status", "active");
  u.searchParams.set("ad_type", "all");
  u.searchParams.set("country", country);
  u.searchParams.set("view_all_page_id", pageId);
  return u.toString();
}

export function metaAdLibraryDomain(domain: string, country = "CL"): string {
  // La biblioteca no filtra por dominio: se busca el dominio como texto, que aparece en la URL del anuncio.
  return metaAdLibrarySearch(domain.replace(/^https?:\/\//, "").replace(/\/.*$/, ""), country);
}

export function tiktokAdLibrarySearch(q: string): string {
  const u = new URL("https://library.tiktok.com/ads");
  u.searchParams.set("region", "all");
  u.searchParams.set("adv_name", q);
  u.searchParams.set("sort_type", "last_shown_date,desc");
  return u.toString();
}

export function tiktokCreativeCenterTopProducts(): string {
  return "https://ads.tiktok.com/business/creativecenter/top-products/pc/es";
}
