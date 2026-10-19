import { ModuleModal } from "../../module-modal";
import ModulePage from "../../wiki/page";

/** Modale du module « Wiki » (soft nav depuis la campagne ; URL directe = page pleine). */
export default async function ModuleModalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ note?: string }>;
}) {
  return (
    <ModuleModal label="Wiki">
      <ModulePage params={params} searchParams={searchParams} />
    </ModuleModal>
  );
}
