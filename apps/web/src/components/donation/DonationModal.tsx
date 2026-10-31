"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { GameModal } from "@/components/game-modal";

/**
 * Adresses de don — MODIFIER ICI pour changer de portefeuille.
 * `btc` : réseau Bitcoin mainnet.
 * `evm` : même adresse sur Base, Arbitrum et Polygon (ETH, USDT, tokens EVM).
 */
export const DONATION_ADDRESSES = {
  btc: "bc1qx439623h3mxkaqzphwjfxn5n0jjgw5evcyrj67",
  evm: "0x5aeff8351400bbeA3528bAE27aDAaa880dd2307a",
} as const;

type Tab = keyof typeof DONATION_ADDRESSES;

const EVM_NETWORKS = ["Base", "Arbitrum", "Polygon"] as const;

// Détection client sans setState d'effet : serveur = false, client = true.
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function BitcoinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9.25" />
      <path d="M9.4 7.5h3.1a2.3 2.3 0 0 1 0 4.6H9.4V7.5Zm0 4.6h3.6a2.35 2.35 0 0 1 0 4.7H9.4v-4.7Z" />
      <path d="M10.9 5.5v2m2.2-2v2m-2.2 11v2m2.2-2v2" />
    </svg>
  );
}

function EthereumIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 2 5.6 12.4 12 16.2l6.4-3.8L12 2Z" opacity="0.85" />
      <path d="m12 17.5-6.4-3.8L12 22l6.4-8.3-6.4 3.8Z" opacity="0.6" />
    </svg>
  );
}

export function DonationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("btc");
  const [copied, setCopied] = useState<Tab | null>(null);
  const [error, setError] = useState<Tab | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseId = useId();
  // Portail : les barres de nav utilisent backdrop-blur, qui ferait de
  // `position: fixed` un cadre de 64 px au lieu du viewport.
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Repli `execCommand` : clipboard API absente (contexte non sécurisé).
  async function copyAddress(which: Tab) {
    const text = DONATION_ADDRESSES[which];
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const field = document.createElement("textarea");
        field.value = text;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(field);
        if (!ok) throw new Error("copy failed");
      }
      setCopied(which);
      setError(null);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
      setError(which);
    }
  }

  function selectTab(next: Tab) {
    setTab(next);
    setCopied(null);
    setError(null);
  }

  const tabIds = { btc: `${baseId}-tab-btc`, evm: `${baseId}-tab-evm` };
  const panelIds = { btc: `${baseId}-panel-btc`, evm: `${baseId}-panel-evm` };

  if (!mounted) return null;

  return createPortal(
    <GameModal open={open} onClose={onClose} label="Soutenir Aetheris">
      <div role="tablist" aria-label="Réseaux de don" className="flex gap-1 border-b border-border">
        {(
          [
            { id: "btc", label: "Bitcoin (BTC)" },
            { id: "evm", label: "Ethereum / EVM" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={tabIds[item.id]}
            aria-selected={tab === item.id}
            aria-controls={panelIds[item.id]}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => selectTab(item.id)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
              event.preventDefault();
              const next = tab === "btc" ? "evm" : "btc";
              selectTab(next);
              document.getElementById(tabIds[next])?.focus();
            }}
            className={`border-b-2 px-4 py-2 text-sm transition-colors ${
              tab === item.id
                ? "border-accent text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={panelIds.btc}
        aria-labelledby={tabIds.btc}
        hidden={tab !== "btc"}
        className="pt-5"
      >
        <div className="flex items-center gap-3">
          <BitcoinIcon className="h-6 w-6 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-semibold">Bitcoin (BTC)</p>
            <p className="text-xs text-muted">Réseau Bitcoin mainnet</p>
          </div>
        </div>
        <AddressBlock
          address={DONATION_ADDRESSES.btc}
          copied={copied === "btc"}
          error={error === "btc"}
          onCopy={() => copyAddress("btc")}
        />
      </div>

      <div
        role="tabpanel"
        id={panelIds.evm}
        aria-labelledby={tabIds.evm}
        hidden={tab !== "evm"}
        className="pt-5"
      >
        <div className="flex items-center gap-3">
          <EthereumIcon className="h-6 w-6 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-semibold">Ethereum / EVM</p>
            <p className="text-xs text-muted">ETH, USDT et tokens EVM</p>
          </div>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
          {EVM_NETWORKS.map((network) => (
            <li key={network} className="border border-border px-2 py-0.5">
              {network}
            </li>
          ))}
        </ul>
        <AddressBlock
          address={DONATION_ADDRESSES.evm}
          copied={copied === "evm"}
          error={error === "evm"}
          onCopy={() => copyAddress("evm")}
        />
      </div>

      <p className="mt-6 border-t border-border pt-4 text-sm leading-relaxed text-muted">
        Aetheris est <span className="text-foreground">100 % gratuit</span> et communautaire. Les
        dons couvrent les frais de serveurs et soutiennent le développement — sans jamais réserver
        de contenu. Merci d&apos;être là.
      </p>
    </GameModal>,
    document.body,
  );
}

function AddressBlock({
  address,
  copied,
  error,
  onCopy,
}: {
  address: string;
  copied: boolean;
  error: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-[0.7rem] tracking-[0.2em] text-muted uppercase">Adresse publique</p>
      <div className="mt-1 flex items-stretch gap-2">
        <code className="min-w-0 flex-1 border border-border bg-background px-3 py-2 font-mono text-sm break-all text-foreground select-all">
          {address}
        </code>
        <button type="button" onClick={onCopy} className="btn btn-primary shrink-0 px-4 text-xs">
          Copier
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-2 min-h-4 text-xs text-accent">
        {copied ? "Copié !" : error ? "Copie impossible — sélectionnez l'adresse." : ""}
      </p>
    </div>
  );
}
