/** Bornes de défilement horizontale d'un conteneur (chevrons de colonnes). */
export function scrollEdgesOf(el: {
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
}): { left: boolean; right: boolean } {
  return {
    left: el.scrollLeft > 1,
    right: el.scrollLeft < el.scrollWidth - el.clientWidth - 1,
  };
}
