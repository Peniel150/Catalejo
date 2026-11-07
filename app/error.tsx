"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid place-items-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center" role="alert">
      <p className="text-base font-semibold">Algo falló de nuestro lado</p>
      <p className="max-w-md text-text-muted">Tus datos están bien. Intenta de nuevo en un minuto.</p>
      <button type="button" onClick={reset} className="mt-2 h-10 rounded-md bg-accent px-4 font-semibold text-on-accent">Reintentar</button>
    </div>
  );
}
