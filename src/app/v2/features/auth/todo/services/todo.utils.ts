import { LeaveStatus, LeaveType } from '../../../../../core/leave/leave-api.service';

const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  CASUAL: 'Casual',
  SICK: 'Sick',
  EARNED: 'Earned',
};

export function leaveTypeLabel(type: LeaveType): string {
  return LEAVE_TYPE_LABEL[type] ?? type;
}

export const LEAVE_STATUS_CHIP: Record<LeaveStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  APPROVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  REJECTED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

/** '' = all statuses (nz-select can't use null as a selectable option value reliably). */
export type LeaveStatusFilter = LeaveStatus | '';

export const LEAVE_STATUS_FILTER_OPTIONS: { label: string; value: LeaveStatusFilter }[] = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'All statuses', value: '' },
];
