/**
 * Signalement de bug — dépôt public, aucune donnée n'est envoyée par l'app.
 * GitHub remplit le formulaire depuis `.github/ISSUE_TEMPLATE/bug_report.md`.
 */
export const BUG_REPORT_URL =
  "https://github.com/Pamacea/aetheris/issues/new?template=bug_report.md";

export function BugReportLink({ className }: { className?: string }) {
  return (
    <a href={BUG_REPORT_URL} target="_blank" rel="noreferrer" className={className}>
      Signaler un bug
    </a>
  );
}
