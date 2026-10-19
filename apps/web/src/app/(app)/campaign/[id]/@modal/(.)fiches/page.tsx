import { ModuleModal } from "../../module-modal";
import ModulePage from "../../fiches/page";

/** Modale du module « Fiches joueurs » (soft nav depuis la campagne ; URL directe = page pleine). */
export default async function ModuleModalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ModuleModal label="Fiches joueurs">
      <ModulePage params={Promise.resolve({ id })} />
    </ModuleModal>
  );
}
