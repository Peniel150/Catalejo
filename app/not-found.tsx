import { EmptyState, ButtonLink } from "@/components/ui.tsx";
export default function NotFound() {
  return <EmptyState title="No encontramos esta página" body="Puede que el producto ya no esté en el catálogo o que el link esté incompleto." action={<ButtonLink href="/radar" variant="primary">Volver al radar</ButtonLink>} />;
}
