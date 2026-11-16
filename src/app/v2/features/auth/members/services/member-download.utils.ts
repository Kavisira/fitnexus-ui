import { Member } from '../../../../../core/members/member-api.service';
import { MemberCard } from '../models/member-card.model';

export function downloadInvoicePdf(member: Member, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Invoice-${member.name.replace(/[^a-zA-Z0-9]+/g, '-')}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportMembersToCsv(cards: MemberCard[]): void {
  if (!cards.length) return;
  const headers = ['Name', 'Phone', 'Email', 'Plan', 'Branch', 'Status', 'Price'];
  const rows = cards.map(c => [
    `"${c.member.name.replace(/"/g, '""')}"`,
    `"${c.member.phone}"`,
    `"${c.member.email || ''}"`,
    `"${c.planLabel}"`,
    `"${c.branchLabel}"`,
    `"${c.member.status}"`,
    `"${c.priceLabel}"`,
  ]);
  const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const link = document.createElement('a');
  link.href = encodeURI(csv);
  link.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
}

