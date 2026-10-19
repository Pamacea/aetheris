import type { TemplateField } from "@aetheris/shared";
import type { NoteDragPayload } from "./note-drop";
import type { WikiNoteMeta } from "../types";
import { noteOver, notePayload, dropLink } from "./note-drop";
import { fieldChrome, type FieldChrome, type FieldDice } from "./template-form-chrome";
import {
  TextField,
  TextareaField,
  ToggleField,
  CssField,
  ImageField,
  TagField,
} from "./template-form-basic-fields";
import { NumberField, CounterField, FormulaField } from "./template-form-numeric-fields";
import { SelectField, MultiSelectField } from "./template-form-choice-fields";
import { ListField } from "./template-form-list-field";
import { JsField } from "./template-form-js-field";

/** Environnement d'un champ : écriture + notes + scopes + drag de notes. */
type FieldRuntime = {
  setValue: (id: string, v: unknown) => void;
  notes: WikiNoteMeta[];
  categoryOf: (n: WikiNoteMeta) => string | null;
  numericScope: Record<string, number>;
  jsScope: Record<string, unknown>;
  onNavigate: (noteId: string) => void;
  noteOver: (e: React.DragEvent) => void;
  notePayload: (e: React.DragEvent) => NoteDragPayload | null;
  dropLink: (e: React.DragEvent, fieldId: string, current: string) => void;
};

export type FieldProps<K extends TemplateField["kind"]> = {
  field: Extract<TemplateField, { kind: K }>;
  value: unknown;
  chrome: FieldChrome;
  rt: FieldRuntime;
};

/** Un champ du formulaire : chrome partagé, puis rendu par kind. */
export function TemplateField({
  field,
  value,
  setValue,
  notes,
  categoryOf,
  numericScope,
  jsScope,
  onNavigate,
  dice,
}: {
  field: TemplateField;
  value: unknown;
  setValue: (id: string, v: unknown) => void;
  notes: WikiNoteMeta[];
  categoryOf: (n: WikiNoteMeta) => string | null;
  numericScope: Record<string, number>;
  jsScope: Record<string, unknown>;
  onNavigate: (noteId: string) => void;
  dice: FieldDice;
}) {
  const chrome = fieldChrome(field, dice, numericScope);
  const rt: FieldRuntime = {
    setValue,
    notes,
    categoryOf,
    numericScope,
    jsScope,
    onNavigate,
    noteOver,
    notePayload,
    dropLink: (e, fieldId, current) => dropLink(e, fieldId, current, setValue),
  };

  switch (field.kind) {
    case "text":
      return <TextField key={field.id} field={field} value={value} chrome={chrome} rt={rt} />;
    case "textarea":
      return <TextareaField key={field.id} field={field} value={value} chrome={chrome} rt={rt} />;
    case "number":
      return <NumberField key={field.id} field={field} value={value} chrome={chrome} rt={rt} />;
    case "counter":
      return <CounterField key={field.id} field={field} value={value} chrome={chrome} rt={rt} />;
    case "select":
      return <SelectField key={field.id} field={field} value={value} chrome={chrome} rt={rt} />;
    case "multiSelect":
      return (
        <MultiSelectField key={field.id} field={field} value={value} chrome={chrome} rt={rt} />
      );
    case "list":
      return <ListField key={field.id} field={field} value={value} chrome={chrome} rt={rt} />;
    case "toggle":
      return <ToggleField key={field.id} field={field} value={value} chrome={chrome} rt={rt} />;
    case "tag":
      return <TagField key={field.id} field={field} value={value} chrome={chrome} rt={rt} />;
    case "image":
      return <ImageField key={field.id} field={field} value={value} chrome={chrome} rt={rt} />;
    case "formula":
      return <FormulaField key={field.id} field={field} value={value} chrome={chrome} rt={rt} />;
    case "css":
      return <CssField key={field.id} field={field} value={value} chrome={chrome} rt={rt} />;
    case "js":
      return (
        <JsField
          key={field.id}
          label={chrome.label}
          help={chrome.help}
          widthCls={chrome.widthCls}
          code={typeof value === "string" ? value : ""}
          scope={jsScope}
          onChange={(v) => setValue(field.id, v)}
        />
      );
  }
}
