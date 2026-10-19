import { ModuleModal } from "../../module-modal";
import ModulePage from "../../journal/page";

/** Modale du module « Journal » (soft nav depuis la campagne ; URL directe = page pleine). */
export default async function ModuleModalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ModuleModal label="Journal">
      <ModulePage params={Promise.resolve({ id })} />
    </ModuleModal>
  );
}
