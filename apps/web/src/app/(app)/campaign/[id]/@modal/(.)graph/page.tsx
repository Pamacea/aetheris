import { ModuleModal } from "../../module-modal";
import ModulePage from "../../graph/page";

/** Modale du module « Graphe de relations » (soft nav depuis la campagne ; URL directe = page pleine). */
export default async function ModuleModalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ModuleModal label="Graphe de relations">
      <ModulePage params={Promise.resolve({ id })} />
    </ModuleModal>
  );
}
