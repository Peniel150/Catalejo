-- Esquema v1 de Catalejo: radar de Dropi con datos propios del usuario (Chile)
-- Postgres en Supabase. Acceso: Row Level Security (RLS), dueño = auth.uid().
-- Dinero: enteros en la unidad mínima de la moneda + columna currency. En CLP la unidad mínima es el peso (sin decimales).
-- Fechas: siempre timestamptz en UTC. Las fechas de venta "por día" se guardan como date en America/Santiago.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;   -- búsqueda por texto
-- create extension if not exists vector; -- v2: búsqueda por imagen

-- Trigger genérico para updated_at
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- 1. Perfil (1-1 con auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  country text not null default 'CL' check (country in ('CL','CO','MX','PE','EC','GT','PA','PY','AR','ES')),
  timezone text not null default 'America/Santiago',
  default_currency text not null default 'CLP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Suscripción (la escribe solo el webhook del proveedor de pagos, con service role)
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','basic','advanced')),
  period text check (period in ('monthly','quarterly','yearly')),
  status text not null default 'active' check (status in ('active','past_due','cancelled','trialing')),
  provider text check (provider in ('mercadopago','lemonsqueezy')),
  provider_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Proveedores (catálogo global, solo lectura para usuarios)
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('dropi','aliclick','mastershop','otro')),
  country text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, country, name)
);

-- 4. Productos del usuario (cargados a mano, por CSV o creados desde un import)
create table products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  external_ref text,                 -- id o SKU del producto en Dropi u otro proveedor, tal como lo ve el usuario
  name text not null,
  category text,
  image_url text,
  country text not null default 'CL',
  currency text not null default 'CLP',
  supplier_cost integer check (supplier_cost >= 0),
  suggested_price integer check (suggested_price >= 0),
  sale_price integer check (sale_price >= 0),
  shipping_cost integer check (shipping_cost >= 0),
  current_stock integer check (current_stock >= 0),
  listed_at date,                    -- fecha en que apareció en el catálogo del proveedor
  status text not null default 'idea' check (status in ('idea','testing','winner','discarded')),
  is_tracked boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, supplier_id, external_ref)
);
create index on products (user_id, status);
create index on products (user_id, is_tracked) where is_tracked;
create index on products (supplier_id);
create index on products using gin (name gin_trgm_ops);

-- 5. Fotos de stock en el tiempo (manual o import). "Repuso stock" = una subida entre dos fotos.
create table product_snapshots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  taken_on date not null,
  stock integer not null check (stock >= 0),
  source text not null check (source in ('manual','csv','dropi_report')),
  created_at timestamptz not null default now(),
  unique (product_id, taken_on)
);
create index on product_snapshots (user_id);
create index on product_snapshots (product_id, taken_on desc);

-- 6. Integraciones del usuario (Shopify por OAuth oficial)
create table integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('shopify')),
  shop_domain text not null,
  access_token_encrypted text not null,   -- cifrado con pgsodium/Vault; nunca expuesto al cliente
  scopes text not null,
  last_synced_at timestamptz,
  status text not null default 'active' check (status in ('active','revoked','error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind, shop_domain)
);

-- 7. Importaciones de archivos (reportes de Dropi exportados por el usuario, CSV de productos)
create table imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('dropi_orders','products_csv','stock_csv')),
  file_path text not null,              -- en Supabase Storage, carpeta privada del usuario
  file_sha256 text not null,            -- evita importar el mismo archivo dos veces
  status text not null default 'pending' check (status in ('pending','processing','done','failed')),
  rows_total integer, rows_ok integer, rows_failed integer,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, file_sha256)
);
create index on imports (user_id, created_at desc);

-- 8. Pedidos propios (de Shopify o del reporte de Dropi)
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  source text not null check (source in ('shopify','dropi_report','manual')),
  external_id text not null,            -- id del pedido en la fuente: hace idempotente el import/sync
  integration_id uuid references integrations(id) on delete set null,
  import_id uuid references imports(id) on delete set null,
  placed_at timestamptz not null,
  currency text not null default 'CLP',
  total integer not null check (total >= 0),
  shipping_cost integer check (shipping_cost >= 0),
  status text not null check (status in ('pending','confirmed','shipped','delivered','returned','cancelled')),
  region text,                          -- región de Chile, para ver dónde se vende y dónde se devuelve
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);
create index on orders (user_id, placed_at desc);
create index on orders (user_id, status);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete set null,  -- null hasta que el usuario lo vincule
  external_sku text,
  title text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  unit_cost integer check (unit_cost >= 0),
  created_at timestamptz not null default now()
);
create index on order_items (order_id);
create index on order_items (user_id, product_id);

-- 9. Ventas diarias por producto (agregado; lo recalcula un job). Base de 7d / 30d / total y del gráfico.
create table product_sales_daily (
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  day date not null,                    -- día en America/Santiago
  units integer not null default 0,
  revenue integer not null default 0,
  delivered_units integer not null default 0,
  returned_units integer not null default 0,
  primary key (product_id, day)
);
create index on product_sales_daily (user_id, day desc);

-- 10. Cálculos guardados (margen, ROAS de equilibrio)
create table calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  kind text not null check (kind in ('margin','breakeven_roas','roi','shopify_plan')),
  inputs jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index on calculations (user_id, created_at desc);

-- Vista con las métricas del buscador
create view product_metrics with (security_invoker = true) as
select p.*,
  coalesce((select sum(units) from product_sales_daily d where d.product_id = p.id and d.day > current_date - 7), 0)  as units_7d,
  coalesce((select sum(units) from product_sales_daily d where d.product_id = p.id and d.day > current_date - 30), 0) as units_30d,
  coalesce((select sum(units) from product_sales_daily d where d.product_id = p.id), 0) as units_total,
  coalesce((select sum(units) from product_sales_daily d where d.product_id = p.id and d.day > current_date - 7), 0)
    - coalesce((select sum(units) from product_sales_daily d where d.product_id = p.id and d.day between current_date - 13 and current_date - 7), 0) as growth_7d,
  case when p.sale_price is not null and p.supplier_cost is not null
       then p.sale_price - p.supplier_cost - coalesce(p.shipping_cost, 0) end as unit_margin
from products p;

-- updated_at
create trigger t_profiles before update on profiles for each row execute function set_updated_at();
create trigger t_subscriptions before update on subscriptions for each row execute function set_updated_at();
create trigger t_suppliers before update on suppliers for each row execute function set_updated_at();
create trigger t_products before update on products for each row execute function set_updated_at();
create trigger t_integrations before update on integrations for each row execute function set_updated_at();
create trigger t_imports before update on imports for each row execute function set_updated_at();
create trigger t_orders before update on orders for each row execute function set_updated_at();

-- RLS: cada usuario ve y modifica solo lo suyo
alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table product_snapshots enable row level security;
alter table integrations enable row level security;
alter table imports enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table product_sales_daily enable row level security;
alter table calculations enable row level security;

create policy own_profile on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy read_own_sub on subscriptions for select using (user_id = auth.uid());   -- escribe solo el webhook
create policy read_suppliers on suppliers for select using (auth.role() = 'authenticated');
create policy own_products on products for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_snapshots on product_snapshots for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy read_own_integrations on integrations for select using (user_id = auth.uid()); -- token: solo servidor
create policy own_imports on imports for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_orders on orders for select using (user_id = auth.uid());
create policy own_order_items on order_items for select using (user_id = auth.uid());
create policy link_order_items on order_items for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_sales on product_sales_daily for select using (user_id = auth.uid());
create policy own_calcs on calculations for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- RADAR DE MERCADO (señales de productos ganadores sin API de Dropi)
-- Datos compartidos entre usuarios: los escribe el servidor (service role) o la extensión vía ruta validada.
-- =====================================================================

-- Producto de mercado: identidad compartida entre fuentes (no pertenece a un usuario)
create table market_products (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  category text,
  image_url text,
  country text not null default 'CL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on market_products using gin (canonical_name gin_trgm_ops);

-- Cada aparición del producto en una fuente
create table market_listings (
  id uuid primary key default gen_random_uuid(),
  market_product_id uuid references market_products(id) on delete set null,  -- null hasta agruparlo
  source text not null check (source in (
    'mercadolibre',        -- API oficial, job diario
    'aliexpress',          -- API oficial de afiliados (hot products), job diario
    'dropi_view',          -- extensión: stock visto por el usuario
    'meta_ads_view',       -- extensión: Meta Ad Library (Facebook/Instagram) vista por el usuario
    'tiktok_cc_view',      -- extensión: TikTok Creative Center Top Ads / Top Products
    'tiktok_adlib_view',   -- extensión: TikTok Ad Library
    'shopify_store_view',  -- extensión: tienda Shopify visitada (más vendidos públicos)
    'manual')),
  external_id text not null,            -- id de ítem ML, id de producto Dropi, id de anuncio Meta, etc.
  country text not null default 'CL',
  title text not null,
  url text,
  image_url text,
  price integer check (price >= 0),
  currency text not null default 'CLP',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, country, external_id)
);
create index on market_listings (market_product_id);
create index on market_listings (source, last_seen_at desc);

-- Observaciones en el tiempo (una por listing por día y métrica)
create table market_observations (
  listing_id uuid not null references market_listings(id) on delete cascade,
  observed_on date not null,            -- día en America/Santiago
  metric text not null check (metric in (
    'ml_bestseller_position',   -- posición en Más vendidos de su categoría (1 = mejor)
    'stock',                    -- stock visto en Dropi
    'ad_days_active',           -- días activos de un anuncio en Meta Ad Library
    'active_ads_count',         -- anuncios activos del dominio/producto
    'tiktok_rank',              -- posición en TikTok Creative Center Top Products
    'tiktok_ad_likes',          -- likes del anuncio en Top Ads
    'tiktok_ad_ctr_rank',       -- nivel de CTR mostrado en Top Ads
    'ali_volume',               -- ventas recientes informadas por la API de AliExpress
    'store_bestseller_position' -- posición en "más vendidos" de una tienda Shopify
  )),
  value numeric not null,
  observers integer not null default 1, -- cuántos usuarios distintos aportaron la observación ese día
  primary key (listing_id, observed_on, metric)
);
create index on market_observations (metric, observed_on desc);

-- Quién aportó qué (para el consentimiento, la calidad y los límites por usuario). No se expone a otros usuarios.
create table market_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references market_listings(id) on delete cascade,
  observed_on date not null,
  metric text not null,
  value numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id, observed_on, metric)
);
create index on market_contributions (listing_id);

-- Consentimiento para aportar al radar compartido
alter table profiles add column share_market_signals boolean not null default false;
alter table profiles add column share_consented_at timestamptz;

-- Puntaje ganador (lo recalcula un job diario; leído por todos los usuarios con plan)
create table market_scores (
  market_product_id uuid not null references market_products(id) on delete cascade,
  computed_on date not null,
  score numeric not null check (score between 0 and 100),
  est_units_7d integer,                 -- estimado por caída de stock en Dropi (si hay observaciones)
  ml_best_position integer,
  max_ad_days_active integer,
  active_ads integer,              -- Meta + TikTok
  meta_ads integer,
  tiktok_ads integer,
  tiktok_best_rank integer,
  ali_volume integer,
  stores_selling integer,          -- tiendas Shopify vistas que lo tienen en más vendidos
  saturation text check (saturation in ('baja','media','alta')),
  components jsonb not null default '{}',  -- detalle de cada señal, para explicar el puntaje
  primary key (market_product_id, computed_on)
);
create index on market_scores (computed_on desc, score desc);

create trigger t_market_products before update on market_products for each row execute function set_updated_at();
create trigger t_market_listings before update on market_listings for each row execute function set_updated_at();

alter table market_products enable row level security;
alter table market_listings enable row level security;
alter table market_observations enable row level security;
alter table market_contributions enable row level security;
alter table market_scores enable row level security;

-- Lectura para usuarios autenticados; las escrituras pasan por el servidor (service role) tras validar
create policy read_market_products on market_products for select using (auth.role() = 'authenticated');
create policy read_market_listings on market_listings for select using (auth.role() = 'authenticated');
create policy read_market_obs on market_observations for select using (auth.role() = 'authenticated');
create policy read_market_scores on market_scores for select using (auth.role() = 'authenticated');
create policy own_contributions on market_contributions for select using (user_id = auth.uid());

-- Vincular un producto propio con su producto de mercado
alter table products add column market_product_id uuid references market_products(id) on delete set null;
create index on products (market_product_id);

-- =====================================================================
-- MEJORAS DESDE LAS RESEÑAS (fixes.md): confiabilidad de proveedores Dropi
-- =====================================================================

-- Datos de despacho y entrega en los pedidos propios (vienen del reporte de Dropi)
alter table orders add column supplier_id uuid references suppliers(id) on delete set null;
alter table orders add column warehouse text;             -- bodega del proveedor
alter table orders add column dispatched_at timestamptz;
alter table orders add column delivered_at timestamptz;
alter table orders add column returned_at timestamptz;
alter table orders add column freight_cost integer check (freight_cost >= 0);        -- flete de ida
alter table orders add column return_freight_cost integer check (return_freight_cost >= 0);
create index on orders (supplier_id, placed_at desc);

-- Stock por bodega en lo que ve la extensión
alter table market_listings add column supplier_id uuid references suppliers(id) on delete set null;
alter table market_listings add column warehouse text;
create index on market_listings (supplier_id);

-- Puntaje de proveedor (job diario). scope 'user' = solo con los pedidos del usuario; 'shared' = agregado con consentimiento
create table supplier_scores (
  supplier_id uuid not null references suppliers(id) on delete cascade,
  scope text not null check (scope in ('user','shared')),
  user_id uuid references profiles(id) on delete cascade,   -- obligatorio si scope = 'user'
  computed_on date not null,
  orders_n integer not null,
  contributors_n integer not null default 1,
  delivery_rate numeric check (delivery_rate between 0 and 1),
  return_rate numeric check (return_rate between 0 and 1),
  avg_dispatch_hours numeric,
  score numeric check (score between 0 and 100),
  check ((scope = 'user') = (user_id is not null))
);
create unique index supplier_scores_uq on supplier_scores (supplier_id, scope, coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), computed_on);
create index on supplier_scores (computed_on desc, score desc);
alter table supplier_scores enable row level security;
-- Los agregados se muestran solo con suficientes contribuyentes, para no exponer los datos de un usuario
create policy read_supplier_scores on supplier_scores for select using (
  (scope = 'user' and user_id = auth.uid()) or (scope = 'shared' and contributors_n >= 5)
);

-- Ventas efectivas en el puntaje de mercado
alter table market_scores add column est_effective_units_7d integer;   -- ventas est. × tasa de entrega del proveedor
alter table market_scores add column supplier_score numeric;
alter table market_scores add column return_flag boolean not null default false;

-- =====================================================================
-- ANUNCIOS DE LA COMPETENCIA (pedido del usuario)
-- Fuente: la Ad Library pública de Meta y la de TikTok, leídas por la extensión
-- en la pestaña que el usuario abre. Sin scraping, sin API privada.
-- =====================================================================

-- Competidores que el usuario sigue (fanpage de Facebook/Instagram, dominio de tienda o cuenta de TikTok)
create table competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  facebook_page_id text,
  facebook_page_name text,
  domain text,
  tiktok_handle text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (facebook_page_id is not null or domain is not null or tiktok_handle is not null)
);
create index on competitors (user_id);
create trigger t_competitors before update on competitors for each row execute function set_updated_at();

-- Anuncios vistos (uno por anuncio y plataforma; compartido como señal de mercado)
create table ads (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('meta','tiktok')),
  library_id text not null,               -- id del anuncio en la biblioteca pública
  library_url text not null,              -- link a la biblioteca pública (el creativo se ve allá, no se re-aloja)
  page_name text,
  page_id text,
  domain text,                            -- dominio de la landing
  country text not null default 'CL',
  started_on date,
  last_seen_active_on date,
  is_active boolean not null default true,
  media_type text check (media_type in ('image','video','carousel')),
  ad_text text,                           -- solo para buscar y agrupar; no se muestra como texto propio
  market_product_id uuid references market_products(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, library_id)
);
create index on ads (domain);
create index on ads (page_id);
create index on ads (market_product_id);
create index on ads (is_active, started_on);
create trigger t_ads before update on ads for each row execute function set_updated_at();

-- Conteo diario de anuncios activos por competidor (para ver cuándo escala o pausa)
create table competitor_snapshots (
  competitor_id uuid not null references competitors(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  observed_on date not null,
  active_ads integer not null,
  new_ads integer not null default 0,
  primary key (competitor_id, observed_on)
);

-- Anuncios guardados por el usuario (tablero de inspiración / swipe file)
create table saved_ads (
  user_id uuid not null references profiles(id) on delete cascade,
  ad_id uuid not null references ads(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  competitor_id uuid references competitors(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  primary key (user_id, ad_id)
);

alter table competitors enable row level security;
alter table ads enable row level security;
alter table competitor_snapshots enable row level security;
alter table saved_ads enable row level security;
create policy own_competitors on competitors for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy read_ads on ads for select using (auth.role() = 'authenticated');
create policy own_comp_snap on competitor_snapshots for select using (user_id = auth.uid());
create policy own_saved_ads on saved_ads for all using (user_id = auth.uid()) with check (user_id = auth.uid());
