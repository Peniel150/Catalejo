import { MobileNav, Sidebar, ThemeToggle, Logo } from "@/components/nav.tsx";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-header items-center gap-3 border-b border-border bg-bg px-4 lg:px-6">
          <MobileNav />
          <div className="lg:hidden"><Logo /></div>
          <form action="/radar" className="ml-auto hidden max-w-md flex-1 sm:block lg:ml-0" role="search">
            <label htmlFor="global-q" className="sr-only">Buscar producto</label>
            <input id="global-q" name="q" placeholder="Buscar producto o categoría" className="input" />
          </form>
          <span className="ml-auto hidden rounded-md border border-border px-3 py-2 text-xs text-text-muted sm:inline">Dropi · Chile</span>
          <ThemeToggle />
        </header>
        <main id="contenido" className="mx-auto max-w-content p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
