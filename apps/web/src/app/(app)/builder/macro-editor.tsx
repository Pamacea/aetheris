"use client";

import { runSandbox } from "@/lib/sandbox";
import { useMacroEditor } from "./macro-editor-state";
import { MacroEditorForm } from "./macro-editor-form";

/**
 * Constructeur de macros par campagne (Phase 8/10) : éditeur JS évalué en
 * sandbox (iframe), résultat = commande envoyée au chat existant
 * (`dice:roll` / `chat:send`, même grammaire que `chat-panel.tsx`).
 * Stockage local : `localStorage["aetheris:macros:<campaignId>"]` —
 * shortcut: macros côté client uniquement, pas de migration Prisma —
 * upgrader vers `Campaign.customScript` ou une table dédiée si besoin de
 * partage multi-appareils.
 * Lecture via useSyncExternalStore (pattern `tri-panel.tsx`) : pas d'effet
 * de chargement, pas de mismatch d'hydratation.
 */
export function MacroEditor({ campaignId }: { campaignId: string }) {
  const {
    socket,
    connected,
    macros,
    currentId,
    name,
    source,
    output,
    error,
    pending,
    startTransition,
    newMacro,
    select,
    save,
    remove,
    setName,
    setSource,
    setOutput,
    setError,
  } = useMacroEditor(campaignId);

  /** Exécute la macro en sandbox et renvoie la commande produite (ou null). */
  async function run(): Promise<string | null> {
    setError(null);
    setOutput(null);
    if (!source.trim()) {
      setError("Macro vide.");
      return null;
    }
    try {
      const result = await runSandbox(source, { title: "Exécution de macro (sandbox)" });
      setOutput(result);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  function test() {
    startTransition(async () => {
      await run();
    });
  }

  function execute() {
    startTransition(async () => {
      const cmd = await run();
      if (!cmd) return;
      const clean = cmd.trim();
      // Même grammaire que chat-panel.tsx.
      const rollMatch = clean.match(/^\/(?:roll|roll?|dé|dés)\s+(.+)/i);
      if (rollMatch?.[1]) {
        socket.emit("dice:roll", {
          campaignId,
          expression: rollMatch[1].slice(0, 100),
        });
        setOutput(`Jet envoyé : ${clean}`);
      } else if (clean.startsWith("/")) {
        setError(`Commande inconnue : ${clean}`);
        setOutput(null);
      } else {
        socket.emit("chat:send", {
          campaignId,
          content: clean.slice(0, 4000),
        });
        setOutput(`Message envoyé : ${clean}`);
      }
    });
  }

  return (
    <MacroEditorForm
      connected={connected}
      macros={macros}
      currentId={currentId}
      name={name}
      source={source}
      output={output}
      error={error}
      pending={pending}
      newMacro={newMacro}
      select={select}
      save={save}
      remove={remove}
      test={test}
      execute={execute}
      setName={setName}
      setSource={setSource}
    />
  );
}
