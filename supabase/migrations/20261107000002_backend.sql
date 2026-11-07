-- Backend de Catalejo: cuentas, tokens de la extensión, ingesta, webhooks, alertas y puntajes de proveedor.

-- Perfil y plan gratis al registrarse
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  insert into subscriptions (user_id, plan, status) values (new.id, 'free', 'active') on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Token personal para la extensión (se guarda solo el hash SHA-256)
create table api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null default 'Extensión de Chrome',
  token_hash text not null unique,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index on api_tokens (user_id);
alter table api_tokens enable row level security;
create policy own_tokens_read on api_tokens for select using (user_id = auth.uid());
create policy own_tokens_revoke on api_tokens for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Webhooks recibidos (idempotencia: un evento se procesa una sola vez)
create table webhook_events (
  provider text not null,
  event_id text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  payload jsonb not null,
  primary key (provider, event_id)
);
alter table webhook_events enable row level security; -- sin políticas: solo service role

-- Alertas enviadas (para no repetirlas) y registro de fallos de jobs
create table alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('stock_low','restock','price_change','delivery_drop','competitor_new_ads')),
  ref_id text not null,
  day date not null,
  message text not null,
  sent_at timestamptz,
  unique (user_id, kind, ref_id, day)
);
alter table alerts enable row level security;
create policy own_alerts on alerts for select using (user_id = auth.uid());

create table job_failures (
  id bigserial primary key,
  job text not null,
  error text not null,
  context jsonb,
  created_at timestamptz not null default now()
);
alter table job_failures enable row level security;

-- Los productos seguidos del radar compartido (seguimiento sin tener que crear un producto propio)
create table tracked_market_products (
  user_id uuid not null references profiles(id) on delete cascade,
  market_product_id uuid not null references market_products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, market_product_id)
);
alter table tracked_market_products enable row level security;
create policy own_tracked on tracked_market_products for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- INGESTA desde la extensión. La llama el servidor (service role) tras validar el token.
-- Cada item ya viene validado por zod en la ruta. Devuelve conteos.
-- ---------------------------------------------------------------------------
create or replace function ingest_extension(p_user uuid, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  it jsonb;
  v_listing uuid;
  v_product uuid;
  v_share boolean;
  n_stock int := 0; n_ads int := 0; n_snap int := 0; n_skip int := 0;
  v_day date;
  v_sup uuid;
begin
  select share_market_signals into v_share from profiles where id = p_user;
  if v_share is null then raise exception 'perfil inexistente'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    v_day := (it->>'day')::date;
    if v_day > (now() at time zone 'America/Santiago')::date or v_day < (now() at time zone 'America/Santiago')::date - 2 then
      n_skip := n_skip + 1; continue; -- solo se aceptan días recientes
    end if;

    if it->>'kind' = 'dropi_stock' then
      insert into market_listings (source, country, external_id, title, url, image_url, price, warehouse, last_seen_at)
      values ('dropi_view', 'CL', it->>'key', left(it->>'name', 200), it->>'url', it->>'image',
              nullif((it->'prices'->>0), '')::int, it->>'warehouse', now())
      on conflict (source, country, external_id) do update
        set title = excluded.title, last_seen_at = now(),
            price = coalesce(excluded.price, market_listings.price),
            warehouse = coalesce(excluded.warehouse, market_listings.warehouse)
      returning id, market_product_id into v_listing, v_product;

      if coalesce(it->>'supplier', '') <> '' then
        insert into suppliers (platform, country, name) values ('dropi', 'CL', left(it->>'supplier', 160))
        on conflict (platform, country, name) do update set name = excluded.name returning id into v_sup;
        update market_listings set supplier_id = v_sup where id = v_listing and supplier_id is distinct from v_sup;
      end if;

      if v_product is null then
        insert into market_products (canonical_name, country) values (left(it->>'name', 200), 'CL') returning id into v_product;
        update market_listings set market_product_id = v_product where id = v_listing;
      end if;

      insert into market_contributions (user_id, listing_id, observed_on, metric, value)
      values (p_user, v_listing, v_day, 'stock', (it->>'stock')::numeric)
      on conflict (user_id, listing_id, observed_on, metric) do update set value = least(market_contributions.value, excluded.value);

      -- La observación compartida solo usa aportes de quienes dieron su consentimiento.
      insert into market_observations (listing_id, observed_on, metric, value, observers)
      select v_listing, v_day, 'stock', min(c.value), count(distinct c.user_id)
      from market_contributions c join profiles pr on pr.id = c.user_id and pr.share_market_signals
      where c.listing_id = v_listing and c.observed_on = v_day and c.metric = 'stock'
      having count(*) > 0
      on conflict (listing_id, observed_on, metric) do update set value = excluded.value, observers = excluded.observers;
      n_stock := n_stock + 1;

    elsif it->>'kind' = 'meta_ad' then
      insert into ads (platform, library_id, library_url, page_name, domain, country, started_on, last_seen_active_on, is_active, media_type)
      values ('meta', it->>'libraryId', it->>'libraryUrl', left(it->>'pageName', 120), it->>'domain', coalesce(it->>'country', 'CL'),
              nullif(it->>'startedOn', '')::date, v_day, coalesce((it->>'isActive')::boolean, true), it->>'mediaType')
      on conflict (platform, library_id) do update
        set last_seen_active_on = greatest(ads.last_seen_active_on, excluded.last_seen_active_on),
            is_active = excluded.is_active,
            page_name = coalesce(excluded.page_name, ads.page_name),
            domain = coalesce(excluded.domain, ads.domain),
            started_on = coalesce(ads.started_on, excluded.started_on);
      n_ads := n_ads + 1;

    elsif it->>'kind' = 'competitor_snapshot' then
      insert into competitor_snapshots (competitor_id, user_id, observed_on, active_ads, new_ads)
      select c.id, p_user, v_day, (it->>'activeAds')::int, 0
      from competitors c where c.user_id = p_user and c.facebook_page_id = it->>'pageId'
      on conflict (competitor_id, observed_on) do update set active_ads = excluded.active_ads;
      if found then n_snap := n_snap + 1; else n_skip := n_skip + 1; end if;
    else
      n_skip := n_skip + 1;
    end if;
  end loop;

  return jsonb_build_object('stock', n_stock, 'ads', n_ads, 'snapshots', n_snap, 'skipped', n_skip);
end $$;
revoke all on function ingest_extension(uuid, jsonb) from public;

-- ---------------------------------------------------------------------------
-- PUNTAJE DE PROVEEDOR: entrega efectiva, devoluciones y horas de despacho (últimos 90 días).
-- 'user' con los pedidos de cada usuario; 'shared' con los de usuarios que comparten.
-- ---------------------------------------------------------------------------
create or replace function compute_supplier_scores(p_day date default (now() at time zone 'America/Santiago')::date)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from supplier_scores where computed_on = p_day;

  insert into supplier_scores (supplier_id, scope, user_id, computed_on, orders_n, contributors_n, delivery_rate, return_rate, avg_dispatch_hours, score)
  select o.supplier_id, 'user', o.user_id, p_day, count(*), 1,
    avg(case when o.status = 'delivered' then 1.0 else 0 end),
    avg(case when o.status = 'returned' then 1.0 else 0 end),
    avg(extract(epoch from (o.dispatched_at - o.placed_at)) / 3600) filter (where o.dispatched_at is not null),
    null
  from orders o
  where o.supplier_id is not null and o.status in ('delivered','returned') and o.placed_at >= p_day - 90
  group by o.supplier_id, o.user_id;

  insert into supplier_scores (supplier_id, scope, user_id, computed_on, orders_n, contributors_n, delivery_rate, return_rate, avg_dispatch_hours, score)
  select o.supplier_id, 'shared', null, p_day, count(*), count(distinct o.user_id),
    avg(case when o.status = 'delivered' then 1.0 else 0 end),
    avg(case when o.status = 'returned' then 1.0 else 0 end),
    avg(extract(epoch from (o.dispatched_at - o.placed_at)) / 3600) filter (where o.dispatched_at is not null),
    null
  from orders o join profiles p on p.id = o.user_id and p.share_market_signals
  where o.supplier_id is not null and o.status in ('delivered','returned') and o.placed_at >= p_day - 90
  group by o.supplier_id;

  -- Puntaje 0..100: entrega (70%), despacho rápido (30%)
  update supplier_scores set score = round(
      70 * greatest(0, least(1, (coalesce(delivery_rate, 0) - 0.5) / 0.45))
    + 30 * greatest(0, least(1, (96 - coalesce(avg_dispatch_hours, 96)) / 84)))
  where computed_on = p_day;

  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function compute_supplier_scores(date) from public;

-- Programación (activar pg_cron en Supabase: Database > Extensions):
-- select cron.schedule('supplier-scores', '30 8 * * *', $$select compute_supplier_scores()$$);  -- 05:30 Chile (UTC-3)
-- Los puntajes de mercado los calcula /api/cron/compute-scores (Vercel Cron, 06:00 Chile) con lib/score.ts.

-- Un competidor puede identificarse solo por el nombre de su página de Facebook.
alter table competitors drop constraint if exists competitors_check;
alter table competitors add constraint competitors_identity_check
  check (facebook_page_id is not null or facebook_page_name is not null or domain is not null or tiktok_handle is not null);
