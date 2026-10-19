"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Editor, Range } from "@tiptap/core";

export interface SuggestionItem {
  title: string;
  hint?: string;
  command?: (props: { editor: Editor; range: Range }) => void;
}

export interface SuggestionListRef {
  onKeyDown(props: { event: KeyboardEvent }): boolean;
}

interface SuggestionListProps {
  items: SuggestionItem[];
  command: (item: SuggestionItem) => void;
  ref?: React.Ref<SuggestionListRef>;
}

/** Menu déroulant partagé : commandes `/` et liens `[[…]]`. */
export function SuggestionList({ items, command, ref }: SuggestionListProps) {
  const [active, setActive] = useState(0);
  const [prevItems, setPrevItems] = useState(items);
  const listRef = useRef<HTMLUListElement>(null);

  // Reset de la sélection quand la liste change (nouvelle frappe).
  if (prevItems !== items) {
    setPrevItems(items);
    setActive(0);
  }

  useEffect(() => {
    listRef.current?.querySelectorAll("li")[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function select(index: number) {
    const item = items[index];
    if (item) command(item);
  }

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown({ event }: { event: KeyboardEvent }) {
        if (event.key === "ArrowDown") {
          setActive((a) => (a + 1) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "ArrowUp") {
          setActive((a) => (a - 1 + items.length) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "Enter") {
          const item = items[active];
          if (item) command(item);
          return true;
        }
        return false;
      },
    }),
    [items, active, command],
  );

  if (items.length === 0) {
    return (
      <div className="suggestion-menu">
        <p className="px-3 py-2 text-xs text-muted">Aucun résultat</p>
      </div>
    );
  }

  return (
    <div className="suggestion-menu">
      <ul ref={listRef} role="listbox">
        {items.map((item, i) => (
          <li
            key={`${item.title}-${i}`}
            role="option"
            aria-selected={i === active}
            className={`suggestion-item${i === active ? " is-active" : ""}`}
            onMouseEnter={() => setActive(i)}
            onMouseDown={(e) => {
              e.preventDefault();
              select(i);
            }}
          >
            <span>{item.title}</span>
            {item.hint && <span className="suggestion-hint">{item.hint}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
