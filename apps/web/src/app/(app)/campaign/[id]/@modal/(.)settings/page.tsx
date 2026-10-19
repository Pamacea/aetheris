import { ModuleModal } from "../../module-modal";
import ModulePage from "../../settings/page";

/** Modale du module « Réglages » (soft nav depuis la campagne ; URL directe = page pleine). */
export default async function ModuleModalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ModuleModal label="Réglages">
      <ModulePage params={Promise.resolve({ id })} />
    </ModuleModal>
  );
}
