import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import {
  AUTOSAVE_MS,
  SAVE_LABELS,
  clearDraft,
  countWords,
  draftStorageKey,
  loadDraft,
  saveDraft,
  type DraftStorage,
  type SaveState,
} from "./novel-autosave";

/** Storage mémoire — pas de DOM, l'interface est injectée. */
function memStorage(init: Record<string, string> = {}): DraftStorage & {
  dump: () => Record<string, string>;
} {
  const map = new Map(Object.entries(init));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    dump: () => Object.fromEntries(map),
  };
}

const doc: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

describe("countWords", () => {
  it("compte les mots en ignorant les espaces de bord", () => {
    expect(countWords("le chat dort")).toBe(3);
    expect(countWords("  le   chat \n dort ")).toBe(3);
  });

  it("vide ou blanc → 0", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n\t ")).toBe(0);
  });
});

describe("draftStorageKey", () => {
  it("isole le brouillon par roman + chapitre", () => {
    expect(draftStorageKey("n1", "c1")).toBe("aetheris:draft:n1:c1");
    expect(draftStorageKey("n1", "c2")).not.toBe(draftStorageKey("n1", "c1"));
  });
});

describe("saveDraft / loadDraft / clearDraft", () => {
  it("round-trip : sauvegarde puis restaure le brouillon", () => {
    const s = memStorage();
    const key = draftStorageKey("n1", "c1");
    saveDraft(s, key, doc, 12, 1_700_000_000_000);

    const draft = loadDraft(s, key);
    expect(draft).not.toBeNull();
    expect(draft?.content).toEqual(doc);
    expect(draft?.wordCount).toBe(12);
    expect(draft?.t).toBe(1_700_000_000_000);
  });

  it("sépare les brouillons de chapitres différents", () => {
    const s = memStorage();
    saveDraft(s, draftStorageKey("n1", "c1"), doc, 5);
    expect(loadDraft(s, draftStorageKey("n1", "c2"))).toBeNull();
  });

  it("absent → null", () => {
    expect(loadDraft(memStorage(), "manquante")).toBeNull();
  });

  it("JSON corrompu → null ET clé nettoyée", () => {
    const key = "aetheris:draft:n1:c1";
    const s = memStorage({ [key]: "{pas-du-json" });
    expect(loadDraft(s, key)).toBeNull();
    expect(s.getItem(key)).toBeNull();
  });

  it("entrée sans contenu → null (clé conservée)", () => {
    const key = "k";
    const s = memStorage({ [key]: JSON.stringify({ wordCount: 3 }) });
    expect(loadDraft(s, key)).toBeNull();
    expect(s.getItem(key)).not.toBeNull();
  });

  it("storage qui throw (mode privé) → null sans exception", () => {
    const broken: DraftStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(loadDraft(broken, "k")).toBeNull();
  });

  it("clearDraft efface le brouillon (sauvegarde réussie)", () => {
    const s = memStorage();
    const key = draftStorageKey("n1", "c1");
    saveDraft(s, key, doc, 1);
    clearDraft(s, key);
    expect(loadDraft(s, key)).toBeNull();
    expect(s.dump()).toEqual({});
  });
});

describe("état d'enregistrement", () => {
  it("AUTOSAVE_MS = debounce 1 s", () => {
    expect(AUTOSAVE_MS).toBe(1_000);
  });

  it("chaque SaveState a un libellé FR", () => {
    const states: SaveState[] = ["idle", "dirty", "saving", "saved", "error"];
    for (const st of states) {
      expect(SAVE_LABELS[st]).toBeTruthy();
    }
    expect(SAVE_LABELS.saved).toBe("Enregistré ✓");
    expect(SAVE_LABELS.saving).toBe("Enregistrement…");
    expect(Object.keys(SAVE_LABELS)).toHaveLength(states.length);
  });
});
