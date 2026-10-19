"use client";

import { useState } from "react";
import { runSandbox } from "@/lib/sandbox";

/**
 * Champ « js » : code exécuté dans une sandbox iframe (jamais la page),
 * le scope des autres champs est passé en argument, la valeur retournée
 * est affichée sous la zone de code.
 */
export function JsField({
  code,
  scope,
  label,
  help,
  widthCls,
  onChange,
}: {
  code: string;
  scope: Record<string, unknown>;
  label: React.ReactNode;
  help: React.ReactNode;
  widthCls?: string;
  onChange: (v: string) => void;
}) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      setResult(await runSandbox(code, { scope, title: "Exécution de champ (sandbox)" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={`flex flex-col gap-1 md:col-span-2 ${widthCls ?? ""}`}>
      {label}
      <textarea
        className="input min-h-20 py-2 font-mono text-xs"
        name="champ-js"
        spellCheck={false}
        value={code}
        placeholder="Ex. return `PV : ${pv}`;"
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn px-3 py-1 text-xs"
          disabled={running || !code.trim()}
          onClick={run}
        >
          {running ? "Exécution…" : "Exécuter"}
        </button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
      {result !== null && (
        <p className="border border-border bg-background px-3 py-1.5 font-mono text-sm text-accent">
          {result}
        </p>
      )}
      {help}
    </div>
  );
}
