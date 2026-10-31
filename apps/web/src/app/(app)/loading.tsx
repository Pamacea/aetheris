export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <p role="status" className="text-sm tracking-[0.2em] text-muted uppercase">
        <span className="mark-tri" aria-hidden />
        Chargement…
      </p>
    </div>
  );
}
