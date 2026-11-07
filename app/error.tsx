"use client";
import { EmptyState } from "@/components/ui.tsx";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <EmptyState title="Algo falló de nuestro lado" body="Tus datos están bien. Intenta de nuevo en un minuto." action={<button type="button" onClick={reset} className="h-10 rounded-md bg-accent px-4 font-semibold text-on-accent">Reintentar</button>} />;
}
