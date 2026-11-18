import { FormField, FormFieldType, FormResultsSummary, FormSubmission } from '../../../../../core/forms/form-api.service';

/** Field type dropdown options — order mirrors the old forms-admin.ts. */
export const FIELD_TYPE_OPTIONS: { label: string; value: FormFieldType }[] = [
  { label: 'Short text', value: 'SHORT_TEXT' },
  { label: 'Long text', value: 'LONG_TEXT' },
  { label: 'Rating (1-5)', value: 'RATING' },
  { label: 'Single choice', value: 'SINGLE_CHOICE' },
  { label: 'Multiple choice', value: 'MULTI_CHOICE' },
  { label: 'Yes / No', value: 'YES_NO' },
  { label: 'Number', value: 'NUMBER' },
  { label: 'Date', value: 'DATE' },
];

export const CHOICE_TYPES = new Set<FormFieldType>(['SINGLE_CHOICE', 'MULTI_CHOICE']);

// Backend DTO hard limits (CreateFormTemplateDto / FormFieldDto on the
// API) — the UI soft-caps to these so a save never trips the server's
// own ArrayMaxSize validation, but the server remains the source of
// truth and still re-validates on every create.
export const MAX_FIELDS = 40;
export const MAX_OPTIONS_PER_FIELD = 20;

export function fieldTypeLabel(type: FormFieldType): string {
  return FIELD_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

/** A single field row in the create/edit template builder. `optionsText`
 * is the raw comma-separated editor value for choice fields — split
 * into `options` only at submit time, mirroring the old
 * forms-admin.ts saveTemplate(). */
export interface TemplateFieldDraft {
  label: string;
  type: FormFieldType;
  required: boolean;
  optionsText?: string;
}

export function newFieldDraft(): TemplateFieldDraft {
  return { label: '', type: 'SHORT_TEXT', required: false };
}

/** Mirrors the old forms-admin.ts saveTemplate() validation: a
 * non-empty name and at least one field with a non-empty label. The
 * backend separately caps total fields at 40 and options per field at
 * 20 (CreateFormTemplateDto) — enforced here too so the UI fails fast
 * with a clear message instead of a raw 400. */
export function validateTemplateDraft(name: string, fields: TemplateFieldDraft[]): string | null {
  if (!name.trim()) {
    return 'Please enter a form name.';
  }
  const clean = fields.filter((f) => f.label.trim());
  if (!clean.length) {
    return 'Add at least one field.';
  }
  if (clean.length > MAX_FIELDS) {
    return `A form can have at most ${MAX_FIELDS} fields.`;
  }
  for (const f of clean) {
    if (CHOICE_TYPES.has(f.type)) {
      const options = splitOptions(f.optionsText);
      if (options.length > MAX_OPTIONS_PER_FIELD) {
        return `"${f.label}" has more than ${MAX_OPTIONS_PER_FIELD} options — please trim the list.`;
      }
    }
  }
  return null;
}

export function splitOptions(optionsText?: string): string[] {
  return (optionsText ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function answerText(answer: FormSubmission['answers'][number], field?: FormField): string {
  if (field?.type === 'MULTI_CHOICE') {
    return answer.choiceValues?.length ? answer.choiceValues.join(', ') : '—';
  }
  if (answer.booleanValue !== null && answer.booleanValue !== undefined) {
    return answer.booleanValue ? 'Yes' : 'No';
  }
  if (answer.numberValue !== null && answer.numberValue !== undefined) {
    return String(answer.numberValue);
  }
  if (answer.choiceValues?.length) {
    return answer.choiceValues.join(', ');
  }
  return answer.textValue ?? '—';
}

export function optionCountEntries(field: FormResultsSummary['fields'][number]): { option: string; count: number }[] {
  const counts = field.optionCounts ?? {};
  return Object.entries(counts).map(([option, count]) => ({ option, count }));
}

export function fieldLabel(fields: FormField[], fieldId: string): string {
  return fields.find((f) => f.id === fieldId)?.label ?? fieldId;
}

/** Card/table values should never render blank. */
export function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return String(value);
}
