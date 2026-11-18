import { LeaveAllocationConfig, LeaveRole, LeaveType } from '../../../../../core/leave/leave-api.service';

export const LEAVE_TYPES: LeaveType[] = ['CASUAL', 'SICK', 'EARNED'];
export const LEAVE_ROLES: LeaveRole[] = ['BRANCH_MANAGER', 'TRAINER', 'FRONT_DESK'];

/** Matches rolePermissions.role.* in the old i18n file — v2 screens hardcode
 * English strings directly rather than going through TranslatePipe. */
const ROLE_LABELS: Record<LeaveRole, string> = {
  BRANCH_MANAGER: 'Manager',
  TRAINER: 'Trainer',
  FRONT_DESK: 'Front desk',
};

const TYPE_LABELS: Record<LeaveType, string> = {
  CASUAL: 'Casual',
  SICK: 'Sick',
  EARNED: 'Earned',
};

export function roleLabel(role: LeaveRole): string {
  return ROLE_LABELS[role];
}

export function leaveTypeLabel(type: LeaveType): string {
  return TYPE_LABELS[type];
}

/** Only Earned carries forward across years (accrues indefinitely up to a
 * cap) — Casual/Sick are wiped to 0 every January 1st by the backend's
 * yearly-expiry cron, so they have no independent cap to configure. */
export function isCarryForwardType(leaveType: LeaveType): boolean {
  return leaveType === 'EARNED';
}

export interface AllocationDraftEntry {
  monthlyAllocation: number;
  carryForwardCap: number;
}

export function configKey(role: LeaveRole, leaveType: LeaveType): string {
  return `${role}:${leaveType}`;
}

/** Builds the draft map for every role x leave-type cell from the server
 * rows, defaulting any missing combination to 0/0 (a brand-new org has no
 * LeaveAllocationConfig rows yet). */
export function buildConfigDraft(rows: LeaveAllocationConfig[]): Record<string, AllocationDraftEntry> {
  const draft: Record<string, AllocationDraftEntry> = {};
  for (const role of LEAVE_ROLES) {
    for (const leaveType of LEAVE_TYPES) {
      const row = rows.find((r) => r.role === role && r.leaveType === leaveType);
      draft[configKey(role, leaveType)] = {
        monthlyAllocation: row ? Number(row.monthlyAllocation) : 0,
        carryForwardCap: row ? Number(row.carryForwardCap) : 0,
      };
    }
  }
  return draft;
}

/** Mirrors the backend's hard block in LeaveService.upsertConfig: the
 * carry-forward cap can never be set below the monthly allocation. This is
 * a soft client-side check only — the server still re-validates and is the
 * source of truth (its BadRequestException message is surfaced verbatim on
 * a 400 if this ever disagrees with it). */
export function validateCarryForwardCap(monthlyAllocation: number, carryForwardCap: number): string | null {
  if (carryForwardCap < monthlyAllocation) {
    return 'Carry-forward cap cannot be lower than the monthly allocation.';
  }
  return null;
}
