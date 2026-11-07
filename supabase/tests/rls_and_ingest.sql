-- Pruebas de acceso (RLS con dos usuarios), ingesta y puntaje de proveedor.
-- Se corre con: npm run test:db  (Postgres local temporal)
\set ON_ERROR_STOP on
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@ejemplo.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@ejemplo.test');

do $$ begin
  assert (select count(*) from profiles) = 2, 'el trigger crea perfiles';
  assert (select count(*) from subscriptions where plan = 'free') = 2, 'el trigger crea plan gratis';
end $$;

update profiles set share_market_signals = true where id = '00000000-0000-0000-0000-00000000000a';

-- Ingesta: A comparte, B no. Ambos ven el mismo producto el mismo día.
do $$
declare r jsonb; today date := (now() at time zone 'America/Santiago')::date;
begin
  r := ingest_extension('00000000-0000-0000-0000-00000000000a', jsonb_build_array(
    jsonb_build_object('kind','dropi_stock','key','dropi:88123','name','Producto de prueba','stock',500,'prices',jsonb_build_array(6500),'day',today),
    jsonb_build_object('kind','meta_ad','libraryId','1234567890123','libraryUrl','https://www.facebook.com/ads/library/?id=1234567890123','pageName','Anunciante de prueba','domain','tienda.ejemplo','startedOn',(today - 20)::text,'isActive',true,'mediaType','video','day',today),
    jsonb_build_object('kind','dropi_stock','key','x','name','viejo','stock',1,'day',(today - 10)::text)
  ));
  assert (r->>'stock')::int = 1 and (r->>'ads')::int = 1 and (r->>'skipped')::int = 1, 'conteos de ingesta: ' || r::text;
  r := ingest_extension('00000000-0000-0000-0000-00000000000b', jsonb_build_array(
    jsonb_build_object('kind','dropi_stock','key','dropi:88123','name','Producto de prueba','stock',480,'day',today)));
  -- La observación compartida usa solo el aporte de A (500), no el de B (480).
  assert (select value from market_observations limit 1) = 500, 'B no comparte: no entra al agregado';
  assert (select observers from market_observations limit 1) = 1, 'un solo observador con consentimiento';
  assert (select count(*) from market_contributions) = 2, 'ambos aportes quedan registrados para su dueño';
  -- Idempotencia: repetir el mismo lote no duplica nada.
  r := ingest_extension('00000000-0000-0000-0000-00000000000a', jsonb_build_array(
    jsonb_build_object('kind','dropi_stock','key','dropi:88123','name','Producto de prueba','stock',500,'day',today)));
  assert (select count(*) from market_listings) = 1 and (select count(*) from market_contributions) = 2, 'ingesta idempotente';
end $$;

-- Datos privados de A
insert into products (user_id, name) values ('00000000-0000-0000-0000-00000000000a', 'Producto privado de A');
insert into competitors (user_id, name, domain) values ('00000000-0000-0000-0000-00000000000a', 'Competidor de A', 'comp.ejemplo');
insert into api_tokens (user_id, token_hash) values ('00000000-0000-0000-0000-00000000000a', 'hash-a');

-- Como B: no ve nada privado de A
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', false);
do $$ begin
  assert (select count(*) from products) = 0, 'B no ve productos de A';
  assert (select count(*) from competitors) = 0, 'B no ve competidores de A';
  assert (select count(*) from api_tokens) = 0, 'B no ve tokens de A';
  assert (select count(*) from subscriptions) = 1, 'B solo ve su suscripción';
  assert (select count(*) from market_contributions) = 1, 'B solo ve su propio aporte';
  assert (select count(*) from market_listings) = 1, 'el radar compartido es visible';
  assert (select count(*) from ads) = 1, 'los anuncios públicos son visibles';
  assert (select count(*) from profiles) = 1, 'B solo ve su perfil';
end $$;
-- B no puede escribir en datos de A ni subirse el plan
update products set name = 'hackeado';
update subscriptions set plan = 'advanced';
reset role;
do $$ begin
  assert (select name from products limit 1) = 'Producto privado de A', 'B no pudo modificar productos de A';
  assert (select count(*) from subscriptions where plan = 'advanced') = 0, 'nadie se sube el plan desde el cliente';
end $$;

-- Sin sesión (anon): nada
set role anon;
select set_config('request.jwt.claims', '', false);
do $$ begin
  begin
    perform count(*) from products;
    raise exception 'anon no debería poder leer products';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Puntaje de proveedor
insert into suppliers (id, platform, country, name) values ('00000000-0000-0000-0000-0000000000f1', 'dropi', 'CL', 'Proveedor de prueba');
insert into orders (user_id, source, external_id, placed_at, total, status, supplier_id, dispatched_at)
select '00000000-0000-0000-0000-00000000000a', 'dropi_report', 'o' || g, now() - interval '5 days', 19990,
       case when g <= 18 then 'delivered' else 'returned' end, '00000000-0000-0000-0000-0000000000f1', now() - interval '5 days' + interval '24 hours'
from generate_series(1, 24) g;
select compute_supplier_scores();
do $$ begin
  assert (select round(delivery_rate, 2) from supplier_scores where scope = 'shared') = 0.75, 'entrega 18 de 24';
  assert (select round(avg_dispatch_hours) from supplier_scores where scope = 'user') = 24, 'despacho 24 h';
  assert (select contributors_n from supplier_scores where scope = 'shared') = 1;
end $$;
-- El agregado compartido con 1 aportante no se muestra a otros (mínimo 5)
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', false);
do $$ begin assert (select count(*) from supplier_scores) = 0, 'B no ve agregados con menos de 5 aportantes ni puntajes de A'; end $$;
reset role;

select 'OK: todas las pruebas de base de datos pasaron' as resultado;
