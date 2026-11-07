import Link from "next/link";
import { Logo, ThemeToggle } from "@/components/nav.tsx";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-bg">
        <nav aria-label="Principal" className="mx-auto flex h-header max-w-content items-center gap-4 px-4 lg:px-6">
          <Logo />
          <div className="ml-auto flex items-center gap-2">
            <Link href="/#precios" className="hidden px-3 py-2 text-text-muted hover:text-text sm:inline">Precios</Link>
            <Link href="/#preguntas" className="hidden px-3 py-2 text-text-muted hover:text-text sm:inline">Preguntas</Link>
            <Link href="/radar" className="inline-flex h-10 items-center rounded-md bg-accent px-4 font-semibold text-on-accent">Entrar</Link>
            <ThemeToggle />
          </div>
        </nav>
      </header>
      <main id="contenido" className="mx-auto max-w-content px-4 lg:px-6">{children}</main>
      <footer className="mt-20 border-t border-border">
        <div className="mx-auto flex max-w-content flex-wrap items-center gap-4 px-4 py-8 text-xs text-text-muted lg:px-6">
          <span>© {new Date().getFullYear()} Catalejo · Hecho en Chile</span>
          <Link href="/privacidad" className="hover:text-text">Privacidad</Link>
          <Link href="/terminos" className="hover:text-text">Términos</Link>
          <span className="ml-auto">Catalejo no está afiliado a Dropi, Meta ni TikTok.</span>
        </div>
      </footer>
    </div>
  );
}
