"use client";

import { useRef, useState } from "react";
import { MAX_IMAGE_BYTES, readFile, readText, type FileKind } from "./create-campaign-files";

const INITIAL = {
  theme: "pandemonium",
  gameSystem: "dnd5e",
  themeScript: null as string | null,
  themeScriptName: null as string | null,
  cover: null as string | null,
  logo: null as string | null,
};

/**
 * État du formulaire de création de campagne (thème, système, assets) :
 * regroupé en un seul `draft` pour garder le composant sous le budget hooks.
 */
export function useCreateCampaignDraft() {
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(INITIAL);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const themeInputRef = useRef<HTMLInputElement>(null);

  function patch(part: Partial<typeof INITIAL>) {
    setDraft((d) => ({ ...d, ...part }));
  }

  async function handleFile(kind: FileKind, file: File | undefined) {
    if (!file) return;
    setError(null);
    if (kind === "theme") {
      patch({ themeScript: await readText(file), themeScriptName: file.name, theme: "custom" });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image trop lourde (max ~1,2 Mo).");
      return;
    }
    const dataUrl = await readFile(file);
    if (kind === "cover") patch({ cover: dataUrl });
    else patch({ logo: dataUrl });
  }

  function reset() {
    setError(null);
    setDraft(INITIAL);
    if (coverInputRef.current) coverInputRef.current.value = "";
    if (logoInputRef.current) logoInputRef.current.value = "";
    if (themeInputRef.current) themeInputRef.current.value = "";
  }

  return {
    error,
    setError,
    draft,
    patch,
    handleFile,
    reset,
    coverInputRef,
    logoInputRef,
    themeInputRef,
  };
}
