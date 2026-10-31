"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type Toast = { id: number; message: string };

const ToastContext = createContext<(message: string) => void>(() => {});

/** Feedback transitoire (copie, sauvegarde). Aucun provider = no-op. */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const push = useCallback((message: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 2500);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="panel px-4 py-2 text-sm text-[var(--foreground)] shadow-lg"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
