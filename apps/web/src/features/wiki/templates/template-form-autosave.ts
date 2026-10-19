"use client";

import { useEffect, useRef } from "react";
import { saveTemplateData } from "./actions";

const AUTOSAVE_DELAY_MS = 1200;

/** Autosave : timer 1,2 s après la dernière frappe ; timer annulé au unmount. */
export function useTemplateAutosave(
  campaignId: string,
  entityId: string,
  onStatus: (s: "saving" | "saved" | "error") => void,
) {
  const pending = useRef<Record<string, unknown> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function scheduleSave(next: Record<string, unknown>) {
    pending.current = next;
    onStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const data = pending.current;
      if (!data) return;
      pending.current = null;
      const res = await saveTemplateData(campaignId, entityId, data);
      onStatus(res.ok ? "saved" : "error");
    }, AUTOSAVE_DELAY_MS);
  }

  return scheduleSave;
}
