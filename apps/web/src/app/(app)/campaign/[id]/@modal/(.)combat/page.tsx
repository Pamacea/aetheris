import { ModuleModal } from "../../module-modal";
import ModulePage from "../../combat/page";

/** Modale du module « Combat & Initiative » (soft nav depuis la campagne ; URL directe = page pleine). */
export default async function ModuleModalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ModuleModal label="Combat & Initiative">
      <ModulePage params={Promise.resolve({ id })} />
    </ModuleModal>
  );
}
