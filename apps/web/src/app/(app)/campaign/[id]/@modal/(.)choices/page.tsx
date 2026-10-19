import { ModuleModal } from "../../module-modal";
import ModulePage from "../../choices/page";

/** Modale du module « Choix » (soft nav depuis la campagne ; URL directe = page pleine). */
export default async function ModuleModalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ModuleModal label="Choix">
      <ModulePage params={Promise.resolve({ id })} />
    </ModuleModal>
  );
}
