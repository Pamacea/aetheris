import { ModuleModal } from "../../module-modal";
import ModulePage from "../../permissions/page";

/** Modale du module « Permissions » (soft nav depuis la campagne ; URL directe = page pleine). */
export default async function ModuleModalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ModuleModal label="Permissions">
      <ModulePage params={Promise.resolve({ id })} />
    </ModuleModal>
  );
}
