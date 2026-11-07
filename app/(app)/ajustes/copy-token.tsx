"use client";
import { useState } from "react";

export function CopyToken({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-2 rounded-md border border-accent p-3" role="status">
      <p className="text-xs font-semibold">Tu código (cópialo ahora, no lo volveremos a mostrar):</p>
      <code className="num break-all rounded-sm bg-surface-2 p-2 text-xs">{token}</code>
      <button type="button" className="h-8 w-fit rounded-md bg-accent px-3 text-xs font-semibold text-on-accent"
        onClick={async () => { try { await navigator.clipboard.writeText(token); setCopied(true); } catch {} }}>
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
