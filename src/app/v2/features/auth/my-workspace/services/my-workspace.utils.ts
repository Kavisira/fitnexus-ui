import { LeaveStatus, LeaveType } from '../../../../../core/leave/leave-api.service';
import { AttendanceStatus } from '../../../../../core/attendance/attendance-api.service';
import { Review } from '../../../../../core/performance/performance-api.service';

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  CASUAL: 'Casual',
  SICK: 'Sick',
  EARNED: 'Earned',
};

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export function leaveStatusColor(status: LeaveStatus): string {
  if (status === 'APPROVED') return 'green';
  if (status === 'REJECTED') return 'red';
  if (status === 'CANCELLED') return 'default';
  return 'gold';
}

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half day',
  ON_LEAVE: 'On leave',
  HOLIDAY: 'Holiday',
};

export function attendanceStatusColor(status: AttendanceStatus): string {
  if (status === 'PRESENT') return 'green';
  if (status === 'ABSENT') return 'red';
  if (status === 'HALF_DAY') return 'gold';
  if (status === 'ON_LEAVE') return 'blue';
  return 'default';
}

export const REVIEW_STATUS_LABEL: Record<Review['status'], string> = {
  PENDING_EMPLOYEE: 'Awaiting your response',
  PENDING_MANAGEMENT: 'Awaiting management',
  SIGNED_OFF: 'Signed off',
};

export const REVIEW_AUTHOR_LABEL: Record<'EMPLOYEE' | 'MANAGEMENT', string> = {
  EMPLOYEE: 'You',
  MANAGEMENT: 'Management',
};

export function reviewStatusColor(status: Review['status']): string {
  if (status === 'SIGNED_OFF') return 'green';
  if (status === 'PENDING_MANAGEMENT') return 'gold';
  return 'blue';
}

export function ratingStars(rating: number | null): string {
  if (rating == null) return '';
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

// Quill (the rich-text editor's underlying engine) reports an empty
// editor as HTML like "<p><br></p>", so a plain .trim() on the model
// value never sees it as blank — strip tags first to get the real text.
export function richTextIsBlank(html: string | null | undefined): boolean {
  return !html?.replace(/<[^>]*>/g, '').trim();
}

export function monthLabel(year: number, month: number, lang: string): string {
  const locale = lang === 'ta' ? 'ta-IN' : 'en-US';
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

export function monthOptions(lang: string): { label: string; value: number }[] {
  const locale = lang === 'ta' ? 'ta-IN' : 'en-US';
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long' });
  return Array.from({ length: 12 }, (_, i) => ({ label: formatter.format(new Date(2000, i, 1)), value: i + 1 }));
}

export function yearOptions(currentYear: number): { label: string; value: number }[] {
  return Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => ({ label: String(y), value: y }));
}
