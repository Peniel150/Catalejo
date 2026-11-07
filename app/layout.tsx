import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { MobileNav, Sidebar, ThemeToggle, Logo } from "@/components/nav.tsx";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jb", weight: ["500", "600"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Catalejo", template: "%s · Catalejo" },
  description: "Qué se vende en Dropi Chile, qué proveedores entregan y qué anuncia tu competencia.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Aplica el tema guardado antes de pintar, para evitar el parpadeo.
const themeScript = `try{var t=localStorage.getItem("catalejo-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-bg focus:p-3">Saltar al contenido</a>
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
      </body>
    </html>
  );
}
