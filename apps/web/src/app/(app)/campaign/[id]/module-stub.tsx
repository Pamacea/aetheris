/** Page provisoire des modules que personne ne reconstruit (protégés par requireCampaignPage). */
export function ModuleStub({ title }: { title: string }) {
  return (
    <div className="w-full px-6 flex flex-1 flex-col gap-6 py-12">
      <h1 className="text-3xl tracking-wide">
        <span className="mark-tri" aria-hidden />
        {title}
      </h1>
      <p className="panel px-4 py-8 text-center text-sm text-muted">Module en construction.</p>
    </div>
  );
}
