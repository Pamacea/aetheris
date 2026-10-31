"use client";

import { useActionState, useEffect, useId, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { USER_THEME_EVENT, USER_THEME_STORAGE_KEY } from "@/components/user-theme";
import { createApiKey, revokeApiKey, type CreateApiKeyState } from "@/features/profile/actions";
import { THEME_PRESETS } from "@/features/campaign-settings/theme-editor-constants";
import { AUTOSAVE_MS } from "@/lib/novel-autosave";

const SECTIONS = [
  { id: "compte", label: "Compte" },
  { id: "appearance", label: "Apparence" },
  { id: "api-keys", label: "Clés API" },
  { id: "shortcuts", label: "Raccourcis" },
] as const;

/** Tokens du thème global (globals.css) — repli du preset Pandémonium, dont le CSS est vide. */
const DEFAULT_COLORS = {
  background: "#0b0907",
  card: "#14100c",
  accent: "#dd5c33",
  foreground: "#e7dcc6",
} as const;

const SWATCHES = [
  { token: "background", label: "fond" },
  { token: "card", label: "surface" },
  { token: "accent", label: "accent" },
  { token: "foreground", label: "texte" },
] as const;

/** Pastille lue dans le CSS du preset : aucune couleur inventée. */
function colorOf(css: string, token: keyof typeof DEFAULT_COLORS): string {
  return new RegExp(`--${token}:\\s*(#[0-9a-f]{3,8})`, "i").exec(css)?.[1] ?? DEFAULT_COLORS[token];
}

const THEME_OPTIONS = [{ id: "default", name: "Défaut", css: "" }, ...THEME_PRESETS];

/** Thème courant dans localStorage — source externe lue sans setState en effet. */
function subscribeTheme(callback: () => void) {
  window.addEventListener(USER_THEME_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(USER_THEME_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function themeSnapshot(): string {
  try {
    return localStorage.getItem(USER_THEME_STORAGE_KEY) ?? "default";
  } catch {
    return "default";
  }
}

function themeServerSnapshot(): string {
  return "default";
}

const PROVIDER_LABELS: Record<string, string> = {
  credential: "Email et mot de passe",
  github: "GitHub",
  discord: "Discord",
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export type ApiKeyItem = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
};

type KeyStatus = "Active" | "Expirée" | "Révoquée";

const STATUS_STYLES: Record<KeyStatus, string> = {
  Active: "border-accent/60 text-accent",
  Expirée: "border-border text-muted",
  Révoquée: "border-destructive/60 text-destructive",
};

function keyStatus(key: ApiKeyItem): KeyStatus {
  if (key.revokedAt) return "Révoquée";
  if (key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now()) return "Expirée";
  return "Active";
}

type AuthAccount = { providerId: string; accountId: string };

type ProfileTabsProps = {
  name: string;
  email: string;
  authAccounts: AuthAccount[];
  apiKeys: ApiKeyItem[];
};

/** Une seule page défilante : les boutons ne sont que des ancres rapides. */
export function ProfileTabs({ name, email, authAccounts, apiKeys }: ProfileTabsProps) {
  const router = useRouter();
  const baseId = useId();
  const toast = useToast();

  // La page défile avec le document : masquer la scrollbar du document, pas d'un conteneur.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("no-scrollbar");
    return () => root.classList.remove("no-scrollbar");
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <nav aria-label="Accès rapides" className="panel sticky top-16 z-10 flex flex-wrap gap-1 p-2">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="btn border-transparent px-3 py-1.5 text-xs text-muted hover:text-foreground"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <section id="compte" aria-labelledby={`${baseId}-compte`} className="panel scroll-mt-32 p-6">
        <h2 id={`${baseId}-compte`} className="mb-5 text-xs tracking-widest text-muted uppercase">
          Compte
        </h2>
        <AccountPanel name={name} email={email} accounts={authAccounts} />
      </section>

      <section
        id="appearance"
        aria-labelledby={`${baseId}-appearance`}
        className="panel scroll-mt-32 p-6"
      >
        <h2
          id={`${baseId}-appearance`}
          className="mb-5 text-xs tracking-widest text-muted uppercase"
        >
          Apparence
        </h2>
        <AppearancePanel />
      </section>

      <section
        id="api-keys"
        aria-labelledby={`${baseId}-api-keys`}
        className="panel scroll-mt-32 p-6"
      >
        <h2 id={`${baseId}-api-keys`} className="mb-5 text-xs tracking-widest text-muted uppercase">
          Clés API
        </h2>
        <ApiKeysPanel apiKeys={apiKeys} baseId={baseId} toast={toast} router={router} />
      </section>

      <section
        id="shortcuts"
        aria-labelledby={`${baseId}-shortcuts`}
        className="panel scroll-mt-32 p-6"
      >
        <h2
          id={`${baseId}-shortcuts`}
          className="mb-5 text-xs tracking-widest text-muted uppercase"
        >
          Raccourcis
        </h2>
        <ul className="divide-y divide-border border-y border-border">
          <li className="flex flex-wrap items-baseline justify-between gap-3 py-3">
            <span className="text-sm">
              Palette de commandes — recherche et navigation globales.
            </span>
            <kbd className="border border-border px-1.5 py-0.5 font-mono text-[0.7rem] text-muted">
              Ctrl / ⌘ + K
            </kbd>
          </li>
          <li className="flex flex-wrap items-baseline justify-between gap-3 py-3">
            <span className="text-sm">
              Dans une campagne — ouvre le module correspondant (les 9 premiers).
            </span>
            <kbd className="border border-border px-1.5 py-0.5 font-mono text-[0.7rem] text-muted">
              1 – 9
            </kbd>
          </li>
          <li className="flex flex-wrap items-baseline justify-between gap-3 py-3">
            <span className="text-sm">
              Éditeur de chapitre — sauvegarde {AUTOSAVE_MS / 1000} s après la dernière frappe et à
              la fermeture de l&apos;onglet.
            </span>
            <span className="border border-border px-1.5 py-0.5 font-mono text-[0.7rem] text-muted">
              Automatique
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}

/** Logos officiels (Simple Icons, CC0) — aucune dépendance ajoutée. */
const PROVIDER_ICONS: Record<string, string> = {
  discord:
    "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z",
  github:
    "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
};

/** Identifiant raccourci : les 4 derniers caractères, l'ID complet en infobulle. */
function shortAccountId(accountId: string): string {
  return accountId.length > 4 ? `…${accountId.slice(-4)}` : accountId;
}

function AccountPanel({
  name,
  email,
  accounts,
}: {
  name: string;
  email: string;
  accounts: AuthAccount[];
}) {
  return (
    <dl className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div>
        <dt className="text-xs tracking-widest text-muted uppercase">Nom</dt>
        <dd className="mt-1 truncate text-lg font-medium">{name}</dd>
      </div>
      <div>
        <dt className="text-xs tracking-widest text-muted uppercase">Adresse e-mail</dt>
        <dd className="mt-1 truncate text-sm">{email}</dd>
      </div>
      <div>
        <dt className="text-xs tracking-widest text-muted uppercase">Méthode de connexion</dt>
        <dd className="mt-2 flex flex-wrap gap-2">
          {accounts.length === 0 ? (
            <span className="text-sm text-muted">Aucune méthode liée.</span>
          ) : (
            accounts.map((account) => {
              const icon = PROVIDER_ICONS[account.providerId];
              const label = PROVIDER_LABELS[account.providerId] ?? account.providerId;
              return (
                <span
                  key={`${account.providerId}:${account.accountId}`}
                  className="inline-flex max-w-full items-center gap-2 border border-border bg-card-hover px-2.5 py-1 text-xs"
                >
                  {icon && (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 shrink-0"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path d={icon} />
                    </svg>
                  )}
                  <span className="font-medium">{label}</span>
                  {account.providerId !== "credential" && (
                    <span title={account.accountId} className="font-mono text-[0.7rem] text-muted">
                      {shortAccountId(account.accountId)}
                    </span>
                  )}
                </span>
              );
            })
          )}
        </dd>
      </div>
    </dl>
  );
}

function AppearancePanel() {
  const themeId = useSyncExternalStore(subscribeTheme, themeSnapshot, themeServerSnapshot);

  function chooseTheme(id: string) {
    try {
      if (id === "default") localStorage.removeItem(USER_THEME_STORAGE_KEY);
      else localStorage.setItem(USER_THEME_STORAGE_KEY, id);
    } catch {
      /* stockage local indisponible */
    }
    window.dispatchEvent(new CustomEvent(USER_THEME_EVENT));
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="text-xs tracking-widest text-muted uppercase">
          Thème de l&apos;interface
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {THEME_OPTIONS.map((option) => {
            const selected = themeId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => chooseTheme(option.id)}
                className={
                  selected
                    ? "flex items-center justify-between gap-3 border border-accent bg-card-hover px-3 py-2 text-left"
                    : "flex items-center justify-between gap-3 border border-border px-3 py-2 text-left hover:bg-card-hover"
                }
              >
                <span className="flex items-center gap-3">
                  <span className="flex" aria-hidden>
                    {SWATCHES.map((swatch) => (
                      <span
                        key={swatch.token}
                        className="-ml-px h-5 w-5 border border-border first:ml-0"
                        style={{ backgroundColor: colorOf(option.css, swatch.token) }}
                      />
                    ))}
                  </span>
                  <span className="text-sm font-medium">{option.name}</span>
                </span>
                <span className="text-xs text-muted">{selected ? "Actif" : ""}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <p className="text-xs text-muted">
        Le thème choisi s&apos;applique à toute l&apos;interface. Sur les pages d&apos;une campagne,
        le thème propre à la campagne peut primer.
      </p>
    </div>
  );
}

function ApiKeysPanel({
  apiKeys,
  baseId,
  toast,
  router,
}: {
  apiKeys: ApiKeyItem[];
  baseId: string;
  toast: (message: string) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [state, formAction, pending] = useActionState<CreateApiKeyState, FormData>(
    (_prev, formData) => createApiKey(formData),
    null,
  );
  const [revoking, setRevoking] = useState<string | null>(null);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast("Clé copiée dans le presse-papiers.");
    } catch {
      toast("Copie impossible — sélectionnez le texte manuellement.");
    }
  }

  async function handleRevoke(key: ApiKeyItem) {
    if (!window.confirm(`Révoquer définitivement la clé « ${key.name} » ?`)) return;
    setRevoking(key.id);
    const result = await revokeApiKey(key.id);
    setRevoking(null);
    if (result.ok) {
      toast("Clé révoquée.");
      router.refresh();
    } else {
      toast(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label htmlFor={`${baseId}-key-name`} className="flex flex-1 flex-col gap-1.5">
          <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">Nom de la clé</span>
          <input
            id={`${baseId}-key-name`}
            name="name"
            className="input input-sm h-8"
            placeholder="Intégration Discord…"
            maxLength={64}
            autoComplete="off"
            required
          />
        </label>

        <label htmlFor={`${baseId}-key-expiration`} className="flex flex-col gap-1.5">
          <span className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">Expiration</span>
          <select
            id={`${baseId}-key-expiration`}
            name="expirationDays"
            className="input input-sm h-8"
            defaultValue="90"
          >
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
            <option value="365">365 jours</option>
            <option value="0">Jamais</option>
          </select>
        </label>

        <button type="submit" className="btn btn-primary h-8 px-3 text-xs" disabled={pending}>
          {pending ? "Création…" : "Créer la clé"}
        </button>
      </form>

      <div aria-live="polite">
        {state && !state.ok && <p className="text-xs text-destructive">{state.error}</p>}

        {state?.ok === true && (
          <div className="border border-accent/60 p-4">
            <p className="text-sm font-medium">Clé « {state.name} » créée.</p>
            <p className="mt-1 text-xs text-muted">
              Copiez-la maintenant : elle ne sera plus jamais affichée.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 break-all border border-border bg-background px-2 py-1 font-mono text-xs">
                {state.token}
              </code>
              <button
                type="button"
                className="btn px-3 py-1.5 text-xs"
                onClick={() => copy(state.token)}
              >
                Copier
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xs tracking-widest text-muted uppercase">Vos clés</h2>
        {apiKeys.length === 0 ? (
          <div className="mt-2 border border-dashed border-border p-8 text-center">
            <p className="text-sm font-medium">Aucune clé API pour le moment</p>
            <p className="mt-1 text-xs text-muted">
              Créez une clé pour connecter un outil externe à votre compte.
            </p>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {apiKeys.map((key) => {
              const status = keyStatus(key);
              return (
                <li key={key.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{key.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted">{key.prefix}…</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Créée le {formatDate(key.createdAt)} ·{" "}
                      {key.expiresAt ? `Expire le ${formatDate(key.expiresAt)}` : "N'expire jamais"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`border px-2 py-0.5 text-[0.7rem] tracking-widest uppercase ${STATUS_STYLES[status]}`}
                    >
                      {status}
                    </span>
                    {status !== "Révoquée" && (
                      <button
                        type="button"
                        className="btn px-3 py-1.5 text-xs"
                        onClick={() => handleRevoke(key)}
                        disabled={revoking === key.id}
                      >
                        {revoking === key.id ? "…" : "Révoquer"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
