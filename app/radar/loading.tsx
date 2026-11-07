export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando radar">
      <div className="skeleton mb-2 h-8 w-[20rem] max-w-full" />
      <div className="skeleton mb-6 h-4 w-[24rem] max-w-full" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-24" />)}</div>
      <div className="grid gap-2">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-14" />)}</div>
    </div>
  );
}
