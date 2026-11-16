import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { MemberCard } from '../models/member-card.model';
import { Member } from '../../../../../core/members/member-api.service';

@Component({
  selector: 'app-member-table',
  imports: [
    CommonModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzDropdownModule,
    NzAvatarModule,
    NzTooltipModule,
  ],
  templateUrl: './member-table.component.html',
  host: { class: 'block w-full' },
})
export class MemberTableComponent {
  readonly cards = input.required<MemberCard[]>();
  readonly loading = input<boolean>(false);
  readonly canWrite = input<boolean>(true);

  readonly viewDetails = output<MemberCard>();
  readonly viewProgress = output<Member>();
  readonly viewFitness = output<Member>();
  readonly logMetrics = output<Member>();
  readonly downloadInvoice = output<Member>();
  readonly editMember = output<Member>();
  readonly deleteMember = output<Member>();

  readonly sortField = signal<'name' | 'plan' | 'trainer' | 'status' | null>(null);
  readonly sortOrder = signal<1 | -1>(1);

  readonly sortedCards = computed(() => {
    const field = this.sortField();
    const cards = this.cards();
    if (!field) return cards;
    const order = this.sortOrder();
    return [...cards].sort((a, b) => {
      let valA = '';
      let valB = '';
      if (field === 'name') {
        valA = a.member.name ?? '';
        valB = b.member.name ?? '';
      } else if (field === 'plan') {
        valA = a.planLabel ?? '';
        valB = b.planLabel ?? '';
      } else if (field === 'trainer') {
        valA = a.member.assignedTrainerEmployee?.name ?? '';
        valB = b.member.assignedTrainerEmployee?.name ?? '';
      } else if (field === 'status') {
        valA = a.member.status ?? '';
        valB = b.member.status ?? '';
      }
      return valA.localeCompare(valB) * order;
    });
  });

  toggleSort(field: 'name' | 'plan' | 'trainer' | 'status'): void {
    if (this.sortField() === field) {
      this.sortOrder.update(o => (o === 1 ? -1 : 1));
    } else {
      this.sortField.set(field);
      this.sortOrder.set(1);
    }
  }
}
