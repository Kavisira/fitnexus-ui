/**
 * Role-specific dashboard copy & visibility. Roles mirror the backend
 * `UserRole` enum: OWNER, BRANCH_MANAGER, TRAINER, FRONT_DESK, STAFF, MEMBER.
 * (STAFF = any employee whose job title isn't Manager/Trainer/Front Desk;
 * MEMBER has no login flow yet but is covered so it's ready when added.)
 */
const SUBTITLE_BY_ROLE: Record<string, string> = {
  OWNER: 'A snapshot of how your gym is doing right now.',
  BRANCH_MANAGER: 'A snapshot of how your gym is doing right now.',
  TRAINER: "Your day at a glance — today's check-ins, members who need attention and follow-ups due.",
  FRONT_DESK: "Today's front-desk queue — check-ins, renewals coming up and follow-ups to make.",
  STAFF: "Today's activity at your branch at a glance.",
  MEMBER: 'Your membership, progress and workouts at a glance.',
};

const DEFAULT_SUBTITLE = "Today's activity at your branch at a glance.";

/** Roles that see the organization's subscription tier/expiry pill. */
const SUBSCRIPTION_ROLES = new Set(['OWNER', 'BRANCH_MANAGER']);

export function dashboardSubtitle(role: string | null): string {
  return (role && SUBTITLE_BY_ROLE[role]) || DEFAULT_SUBTITLE;
}

export function canSeeSubscription(role: string | null): boolean {
  return !!role && SUBSCRIPTION_ROLES.has(role);
}
