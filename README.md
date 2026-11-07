# Catalejo

Qué se vende en Dropi Chile, qué proveedores entregan y qué anuncia tu competencia.

## La app (web)

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 13 pruebas
npm run build
```

Hoy usa **datos de ejemplo** (`lib/seed.ts`). La capa `lib/data.ts` se reemplaza por Supabase sin tocar las pantallas.

## La extensión de Chrome

1. Abre `chrome://extensions` y activa **Modo de desarrollador**.
2. Toca **Cargar descomprimida** y elige la carpeta `extension/`.
3. Entra a tu catálogo de Dropi Chile: verás una etiqueta de Catalejo en cada producto y un aviso abajo a la derecha (con botón Pausar).
4. Abre la biblioteca de anuncios de Facebook (país Chile): cada anuncio muestra sus días activo y los botones Guardar, "Todos los de este dominio" y "Seguir anunciante".

La extensión solo lee lo que ya tienes en pantalla. No navega sola, no hace scroll, no descarga creativos y no envía nada hasta que conectes tu cuenta. Sus datos quedan en tu navegador (botón "Exportar datos" en el ícono).

## Estructura

- `app/`: pantallas (radar, detalle, proveedores, competidores, anuncios guardados, calculadora COD).
- `lib/score.ts`: estimación de ventas por caída de stock y puntaje explicado.
- `lib/cod.ts`: rentabilidad en contra entrega con devoluciones.
- `lib/adlinks.ts`: links prellenados a las bibliotecas públicas de anuncios.
- `extension/`: extensión MV3 (lectores probados en `parsers.test.mjs`).

## Backend

Ver `replica/backend.md` (en la carpeta de planificación) y `.env.example`. Sin variables, la app corre en modo demostración.

```bash
npm run test:db     # migraciones + pruebas de RLS con dos usuarios en Postgres local
npm run db:migrate  # aplica las migraciones a DATABASE_URL (Supabase)
```
