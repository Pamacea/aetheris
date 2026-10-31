/** MIME des notes glissées (même valeur que la palette VTT côté émetteur). */
export const NOTE_MIME = "application/x-aetheris-note";

export type NoteDragPayload = { id: string; title: string };

/** Démarre le drag d'une fiche/note vers un champ (lien ou ligne de liste). */
export function noteDragStart(e: React.DragEvent, note: NoteDragPayload): void {
  e.dataTransfer.setData(NOTE_MIME, JSON.stringify(note));
  e.dataTransfer.setData("text/plain", note.title);
  e.dataTransfer.effectAllowed = "link";
}

/** Payload d'une note glissée depuis la palette Lore — null si autre drag. */
export function notePayload(e: React.DragEvent): NoteDragPayload | null {
  if (!e.dataTransfer.types.includes(NOTE_MIME)) return null;
  try {
    const p = JSON.parse(e.dataTransfer.getData(NOTE_MIME)) as NoteDragPayload;
    return p?.id && p.title ? p : null;
  } catch {
    return null;
  }
}

/** N'accepte le drop que pour les notes glissées (et non fichiers/texte). */
export function noteOver(e: React.DragEvent): void {
  if (e.dataTransfer.types.includes(NOTE_MIME)) e.preventDefault();
}

/** Drop d'une note sur un champ texte : insère le lien wiki `[[Titre]]`. */
export function dropLink(
  e: React.DragEvent,
  fieldId: string,
  current: string,
  setValue: (id: string, v: unknown) => void,
): void {
  const n = notePayload(e);
  if (!n) return;
  e.preventDefault();
  setValue(fieldId, current ? `${current} [[${n.title}]]` : `[[${n.title}]]`);
}
