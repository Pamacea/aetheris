import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";

/**
 * Rend un document JSON TipTap côté serveur, sans DOM.
 * `generateHTML` (@tiptap/core) passe par `document.implementation` : il ne
 * peut pas s'exécuter dans un Server Component, d'où ce rendu React direct.
 */

type Mark = NonNullable<JSONContent["marks"]>[number];

/** Allowlist d'URL pour les liens rendus publiquement (contenu auteur non fiable). */
export function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const value = href.trim();
  if (!value) return null;
  // Relatif (ancre, chemin, requête) : pas de schéma.
  if (/^[/#?]/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:"
      ? value
      : null;
  } catch {
    return null;
  }
}

function alignStyle(attrs?: JSONContent["attrs"]): CSSProperties | undefined {
  return attrs?.textAlign ? { textAlign: attrs.textAlign } : undefined;
}

function applyMark(node: ReactNode, mark: Mark, key: number): ReactNode {
  switch (mark.type) {
    case "bold":
      return <strong key={key}>{node}</strong>;
    case "italic":
      return <em key={key}>{node}</em>;
    case "strike":
      return <s key={key}>{node}</s>;
    case "underline":
      return <u key={key}>{node}</u>;
    case "code":
      return <code key={key}>{node}</code>;
    case "link": {
      const href = safeHref(mark.attrs?.href);
      if (!href) return node;
      return (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer">
          {node}
        </a>
      );
    }
    case "highlight":
      return (
        <mark
          key={key}
          style={mark.attrs?.color ? { backgroundColor: mark.attrs.color } : undefined}
        >
          {node}
        </mark>
      );
    case "textStyle":
      return (
        <span
          key={key}
          style={{
            color: mark.attrs?.color,
            fontFamily: mark.attrs?.fontFamily,
            fontSize: mark.attrs?.fontSize,
          }}
        >
          {node}
        </span>
      );
    default:
      return node;
  }
}

function renderNode(node: JSONContent, key: number): ReactNode {
  const children = node.content?.map(renderNode);

  switch (node.type) {
    case "text": {
      const marked = (node.marks ?? []).reduce<ReactNode>(
        (acc, mark, index) => applyMark(acc, mark, index),
        node.text ?? "",
      );
      return <Fragment key={key}>{marked}</Fragment>;
    }
    case "hardBreak":
      return <br key={key} />;
    case "paragraph":
      return (
        <p key={key} style={alignStyle(node.attrs)}>
          {children}
        </p>
      );
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 3);
      const Tag = `h${level}` as "h1" | "h2" | "h3";
      return (
        <Tag key={key} style={alignStyle(node.attrs)}>
          {children}
        </Tag>
      );
    }
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return (
        <ol key={key} start={node.attrs?.start}>
          {children}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "codeBlock":
      return (
        <pre key={key}>
          <code>{children}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr key={key} />;
    case "table":
      return (
        <table key={key}>
          <tbody>{children}</tbody>
        </table>
      );
    case "tableRow":
      return <tr key={key}>{children}</tr>;
    case "tableHeader":
      return (
        <th key={key} colSpan={node.attrs?.colspan} rowSpan={node.attrs?.rowspan}>
          {children}
        </th>
      );
    case "tableCell":
      return (
        <td key={key} colSpan={node.attrs?.colspan} rowSpan={node.attrs?.rowspan}>
          {children}
        </td>
      );
    default:
      return <Fragment key={key}>{children}</Fragment>;
  }
}

export function TiptapContent({ content }: { content: JSONContent | null }) {
  if (!content) return null;
  return <>{renderNode(content, 0)}</>;
}
