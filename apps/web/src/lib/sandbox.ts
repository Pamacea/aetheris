/**
 * Exécution d'un code JS dans une iframe `sandbox="allow-scripts"` SANS
 * `allow-same-origin` : origine opaque, aucun accès aux cookies, au
 * localStorage ni au DOM du parent. Le seul canal de sortie est un
 * postMessage vérifié par `e.source === iframe.contentWindow`.
 *
 * `scope` est injecté comme argument de `new Function("scope", code)` —
 * les valeurs passées doivent être sérialisables en JSON.
 * shortcut: boucle infinie tuée par destruction de l'iframe (2 s) —
 * upgrader vers un Worker dédié si un timeout insuffisant est rencontré.
 */
interface SandboxRunOptions {
  /** Valeurs exposées au code sous le nom `scope` (ex. champs d'une fiche). */
  scope?: unknown;
  /** Titre de l'iframe (accessibilité). */
  title?: string;
  /** Délai maximal avant destruction de l'iframe (défaut 2 000 ms). */
  timeoutMs?: number;
}

export function runSandbox(code: string, opts: SandboxRunOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeoutMs = opts.timeoutMs ?? 2_000;
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.setAttribute("title", opts.title ?? "Exécution en sandbox");
    iframe.style.display = "none";

    const id = `sbx-${Math.random().toString(36).slice(2)}`;
    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      iframe.remove();
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Exécution expirée (${timeoutMs / 1_000} s) — probable boucle infinie.`));
    }, timeoutMs);
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return; // seul notre iframe parle
      const data = e.data as { id?: unknown; result?: unknown; error?: unknown };
      if (data?.id !== id) return;
      cleanup();
      if (typeof data.error === "string") {
        reject(new Error(data.error));
        return;
      }
      const raw = data.result;
      const text =
        typeof raw === "string"
          ? raw
          : typeof raw === "number" || typeof raw === "boolean"
            ? String(raw)
            : null;
      if (text === null || !text.trim()) {
        reject(new Error('Le code doit retourner une valeur affichable, ex. return "…".'));
        return;
      }
      resolve(text);
    };

    window.addEventListener("message", onMessage);
    // « < » échappé : le code source ne peut pas fermer la balise </scr…>.
    const codeLiteral = JSON.stringify(code).replace(/</g, "\\u003c");
    const scopeLiteral = JSON.stringify(opts.scope ?? {}).replace(/</g, "\\u003c");
    const idLiteral = JSON.stringify(id);
    iframe.srcdoc =
      '<!doctype html><meta charset="utf-8"><script>try{' +
      "var code=" +
      codeLiteral +
      ";var scope=" +
      scopeLiteral +
      ';var result=(new Function("scope",code))(scope);' +
      "parent.postMessage({id:" +
      idLiteral +
      ",result:result},'*');" +
      "}catch(err){parent.postMessage({id:" +
      idLiteral +
      ",error:String((err&&err.message)||err)},'*');}" +
      "</scr" +
      "ipt>";
    document.body.appendChild(iframe);
  });
}
