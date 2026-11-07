import { createRoot } from "react-dom/client";
import { MobileNav, Sidebar, ThemeToggle, Logo } from "@/components/nav.tsx";
import { useLoc } from "./store.ts";
import { CalcPage, CompetitorPage, CompetitorsPage, FollowPage, NotInDemo, ProductPage, RadarPage, SavedAdsPage, SuppliersPage } from "./pages.tsx";
import { navigate } from "./store.ts";

function Route() {
  const { path, search } = useLoc();
  let m;
  if ((m = path.match(/^\/radar\/([^/]+)$/))) return <ProductPage id={m[1]} search={search} />;
  if ((m = path.match(/^\/competidores\/([^/]+)$/))) return <CompetitorPage id={m[1]} />;
  switch (path) {
    case "/proveedores": return <SuppliersPage />;
    case "/competidores": return <CompetitorsPage />;
    case "/anuncios": return <SavedAdsPage />;
    case "/seguimiento": return <FollowPage />;
    case "/herramientas": return <CalcPage />;
    case "/importar": return <NotInDemo title="Importar pedidos de Dropi" body="Con tu cuenta subes el reporte de pedidos de Dropi (Excel o CSV) y medimos la entrega de tus proveedores. Nunca leemos datos de tus clientes." />;
    case "/ajustes": return <NotInDemo title="Ajustes" body="Con tu cuenta: tu plan, el código para conectar la extensión, compartir señales y eliminar la cuenta." />;
    default: return <RadarPage search={search} />;
  }
}

function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-header items-center gap-3 border-b border-border bg-bg px-4 lg:px-6">
          <MobileNav />
          <div className="lg:hidden"><Logo /></div>
          <form className="ml-auto hidden max-w-md flex-1 sm:block lg:ml-0" role="search"
            onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get("q"); navigate(`/radar?q=${encodeURIComponent(String(q ?? ""))}`); }}>
            <label htmlFor="global-q" className="sr-only">Buscar producto</label>
            <input id="global-q" name="q" placeholder="Buscar producto o categoría" className="input" />
          </form>
          <span className="ml-auto hidden rounded-md border border-border px-3 py-2 text-xs text-text-muted sm:inline">Dropi · Chile</span>
          <ThemeToggle />
        </header>
        <main id="contenido" className="mx-auto max-w-content p-4 lg:p-6"><Route /></main>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
