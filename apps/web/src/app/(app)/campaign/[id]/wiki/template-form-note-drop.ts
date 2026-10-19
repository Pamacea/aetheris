import { NOTE_MIME, type NoteDragPayload } from "../vtt/notes-palette";

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
