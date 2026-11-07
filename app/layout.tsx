import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jb", weight: ["500", "600"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")),
  title: { default: "Catalejo", template: "%s · Catalejo" },
  description: "Qué se vende en Dropi Chile, qué proveedores entregan y qué anuncia tu competencia.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Aplica el tema guardado antes de pintar, para evitar el parpadeo.
const themeScript = `try{var t=localStorage.getItem("catalejo-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}if(/access_token=|error_description=/.test(location.hash)&&location.pathname!=="/auth/entrar"){location.replace("/auth/entrar"+location.hash)}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-bg focus:p-3">Saltar al contenido</a>
        {children}
      </body>
    </html>
  );
}
