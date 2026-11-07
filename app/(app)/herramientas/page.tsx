import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui.tsx";
import { CodCalculator } from "./calc.tsx";

export const metadata: Metadata = { title: "Calculadora COD" };

export default function ToolsPage() {
  return (
    <>
      <PageHeader title="Calculadora de contra entrega" sub="Cuánto ganas de verdad cuando una parte de los pedidos no se entrega." />
      <Suspense><CodCalculator /></Suspense>
    </>
  );
}
