"use client";

import type * as React from "react";
import { importTemplates } from "./actions";
import type { BuilderState } from "./builder-state";

export type TemplateIO = ReturnType<typeof useTemplateIO>;

export function useTemplateIO(st: BuilderState) {
  const { campaignId, items, setStatus, setError, setNotice } = st;

  function handleExport() {
    const payload = {
      version: 1,
      templates: items.map((t) => ({
        name: t.name,
        ...(t.category ? { category: t.category } : {}),
        schema: t.schema,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aetheris-templates.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let payload: unknown;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      setError("Fichier JSON invalide.");
      setStatus("error");
      return;
    }
    const res = await importTemplates(campaignId, payload);
    if (res.ok) {
      setError(null);
      setNotice(
        `${res.imported} modèle${res.imported > 1 ? "s" : ""} importé${
          res.imported > 1 ? "s" : ""
        } (${res.overwritten} écrasé${res.overwritten > 1 ? "s" : ""}).`,
      );
      setStatus("saved");
    } else {
      setError(res.error);
      setStatus("error");
    }
  }

  return { handleExport, handleImportFile };
}
