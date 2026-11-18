import { Lead, LeadStatus } from '../../../../../core/leads/lead-api.service';

export type StatusColor = 'blue' | 'default' | 'orange' | 'green' | 'red';

export const STATUS_COLOR: Record<LeadStatus, StatusColor> = {
  NEW: 'blue',
  CONTACTED: 'default',
  TRIAL_SCHEDULED: 'orange',
  TRIAL_COMPLETED: 'orange',
  CONVERTED: 'green',
  LOST: 'red',
};

// Full list — used for badge labels wherever a lead's status needs to be
// shown as text, including CONVERTED/LOST.
export const STATUS_OPTIONS: { label: string; value: LeadStatus }[] = [
  { label: 'New', value: 'NEW' },
  { label: 'Contacted', value: 'CONTACTED' },
  { label: 'Trial scheduled', value: 'TRIAL_SCHEDULED' },
  { label: 'Trial completed', value: 'TRIAL_COMPLETED' },
  { label: 'Converted', value: 'CONVERTED' },
  { label: 'Lost', value: 'LOST' },
];

// The status dropdown on the detail/edit form only offers the active
// pipeline stages — CONVERTED/LOST are reached exclusively through the
// "Conclude" control, which also captures the required comment.
export const ACTIVE_STATUS_OPTIONS = STATUS_OPTIONS.filter(
  (s) => s.value !== 'CONVERTED' && s.value !== 'LOST',
);

export const CONCLUDE_OUTCOME_OPTIONS: { label: string; value: 'CONVERTED' | 'LOST' }[] = [
  { label: 'Converted', value: 'CONVERTED' },
  { label: 'Lost', value: 'LOST' },
];

export function statusLabel(status: LeadStatus): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

export function statusColor(status: LeadStatus): StatusColor {
  return STATUS_COLOR[status];
}

/** Card/table values should never render blank. */
export function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return String(value);
}

export function initials(lead: Lead): string {
  return (lead.name || '?').trim().charAt(0).toUpperCase();
}

/** The list/card endpoints embed just the last few notes (see
 * LeadsService.findAll) — this reads out the single latest one, or null
 * if none logged. */
export function lastNote(lead: Lead): string | null {
  return lead.activities?.[0]?.note ?? null;
}

/** The comment attached to a concluded lead's outcome — lostReason for
 * LOST, concludeComment for CONVERTED — or null while the lead is still
 * active. */
export function concludeInfo(lead: Lead): string | null {
  if (lead.status === 'LOST') {
    return lead.lostReason;
  }
  if (lead.status === 'CONVERTED') {
    return lead.concludeComment;
  }
  return null;
}

/** A lead is overdue when it has a follow-up date in the past and hasn't
 * reached a terminal stage (Converted/Lost) yet. */
export function isOverdue(lead: Lead): boolean {
  if (!lead.nextFollowUpAt || lead.status === 'CONVERTED' || lead.status === 'LOST') {
    return false;
  }
  return new Date(lead.nextFollowUpAt).getTime() < Date.now();
}

export interface LeadCreateFormValue {
  name: string;
  phone: string;
  email: string;
  branchId: string;
  source: string;
  interestedPlan: string;
  assignedToEmployeeId: string | null;
  nextFollowUpAt: Date | null;
}

/** Mirrors the old leads.ts reactive-form validators for the create
 * form: name required/min 2, phone required/min 5, email format if
 * present, branch required. */
export function validateLeadCreateForm(v: LeadCreateFormValue): string | null {
  if (!v.name || v.name.trim().length < 2) {
    return 'Name must be at least 2 characters.';
  }
  if (!v.phone || v.phone.trim().length < 5) {
    return 'Phone must be at least 5 characters.';
  }
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) {
    return 'Please enter a valid email address.';
  }
  if (!v.branchId) {
    return 'Please select a branch.';
  }
  return null;
}

export interface LeadDetailFormValue extends LeadCreateFormValue {
  status: LeadStatus;
  concludeChecked: boolean;
  concludeOutcome: 'CONVERTED' | 'LOST';
  concludeComment: string;
}

/** Mirrors the old leads.ts detail-form validation, including the hard
 * block requiring a non-empty comment when concluding as Converted or
 * Lost (also enforced server-side in LeadsService.update). */
export function validateLeadDetailForm(v: LeadDetailFormValue): string | null {
  const base = validateLeadCreateForm(v);
  if (base) {
    return base;
  }
  if (v.concludeChecked && !v.concludeComment.trim()) {
    return 'A comment is required to mark this lead as converted or lost.';
  }
  return null;
}
