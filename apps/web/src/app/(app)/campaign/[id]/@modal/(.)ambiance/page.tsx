import { ModuleModal } from "../../module-modal";
import ModulePage from "../../ambiance/page";

/** Modale du module « Ambiance » (soft nav depuis la campagne ; URL directe = page pleine). */
export default async function ModuleModalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ModuleModal label="Ambiance">
      <ModulePage params={Promise.resolve({ id })} />
    </ModuleModal>
  );
}
