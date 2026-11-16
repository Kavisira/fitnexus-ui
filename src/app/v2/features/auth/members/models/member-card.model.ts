import { Member, MemberMetricEntry } from '../../../../../core/members/member-api.service';
import { currencySymbol } from '../../../../../core/constants/currencies';

export interface MemberCard {
  member: Member;
  ageLabel: string;
  priceLabel: string;
  latest: MemberMetricEntry | null;
  branchLabel: string;
  planLabel: string;
  emailLabel: string;
  sourceLabel: string;
  paymentModeLabel: string;
  bloodGroupLabel: string;
}

export function calculateAge(dobStr: string | null | undefined): string {
  if (!dobStr) return '-';
  const dob = new Date(dobStr);
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const hadBirthday =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hadBirthday) years -= 1;
  return `${years}`;
}

export function formatMemberPrice(member: Member): string {
  const sym = currencySymbol(member.branch?.currency);
  const num = Number(member.price ?? 0);
  return `${sym}${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function buildMemberCard(member: Member): MemberCard {
  return {
    member,
    ageLabel: calculateAge(member.dateOfBirth),
    priceLabel: formatMemberPrice(member),
    latest: member.metricEntries?.[0] ?? null,
    branchLabel: member.branch?.location ?? '—',
    planLabel: member.plan?.name ?? '—',
    emailLabel: member.email ?? '—',
    sourceLabel: member.source ?? '—',
    paymentModeLabel: member.paymentMode ?? '—',
    bloodGroupLabel: member.bloodGroup ?? '—',
  };
}
