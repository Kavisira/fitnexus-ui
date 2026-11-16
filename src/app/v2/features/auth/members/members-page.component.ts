import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzModalModule } from 'ng-zorro-antd/modal';

import { MemberStore } from '../../../../core/members/member-store.service';
import { MemberApiService, Member, MemberPayload, MemberStatus, MetricEntryPayload } from '../../../../core/members/member-api.service';
import { BranchStore } from '../../../../core/branches/branch-store.service';
import { EmployeeStore } from '../../../../core/employees/employee-store.service';
import { PlanApiService, Plan } from '../../../../core/plans/plan-api.service';
import { OfferApiService, Offer } from '../../../../core/offers/offer-api.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { ConfirmService } from '../../../../core/confirm/confirm.service';
import { PermissionsService } from '../../../../core/roles/permissions.service';
import { MemberCard, buildMemberCard } from './models/member-card.model';
import { MemberFormService } from './services/member-form.service';

import { MemberFilterBarComponent } from './components/member-filter-bar.component';
import { MemberTableComponent } from './components/member-table.component';
import { MemberCardGridComponent } from './components/member-card-grid.component';
import { MemberDetailModalComponent } from './components/member-detail-modal.component';
import { MemberMetricsModalComponent } from './components/member-metrics-modal.component';
import { MemberProgressModalComponent } from './components/member-progress-modal.component';
import { MemberFormModalComponent } from './components/member-form-modal.component';
import { MemberFitnessDialog } from '../../../../pages/auth/members/member-fitness-dialog/member-fitness-dialog';
import { downloadInvoicePdf, exportMembersToCsv } from './services/member-download.utils';

@Component({
  selector: 'app-v2-members-page',
  imports: [
    CommonModule,
    NzPaginationModule,
    NzModalModule,
    MemberFilterBarComponent,
    MemberTableComponent,
    MemberCardGridComponent,
    MemberDetailModalComponent,
    MemberMetricsModalComponent,
    MemberProgressModalComponent,
    MemberFormModalComponent,
    MemberFitnessDialog,
  ],
  providers: [MemberFormService],
  templateUrl: './members-page.component.html',
  host: { class: 'flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-full' },
})
export class V2MembersPageComponent implements OnInit {
  readonly memberStore = inject(MemberStore);
  private memberApi = inject(MemberApiService);
  readonly branchStore = inject(BranchStore);
  readonly employeeStore = inject(EmployeeStore);
  private planApi = inject(PlanApiService);
  private offerApi = inject(OfferApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private permissions = inject(PermissionsService);

  readonly search = signal('');
  readonly selectedBranchIds = signal<string[]>([]);
  readonly selectedStatuses = signal<MemberStatus[]>([]);
  readonly ptOnly = signal(false);
  readonly viewMode = signal<'table' | 'grid'>('table');
  readonly page = signal(1);
  readonly pageSize = signal(10);

  readonly plans = signal<Plan[]>([]);
  readonly offers = signal<Offer[]>([]);

  readonly detailCard = signal<MemberCard | null>(null);
  readonly metricsMember = signal<Member | null>(null);
  readonly progressMember = signal<Member | null>(null);
  readonly formModalVisible = signal(false);
  readonly editingMember = signal<Member | null>(null);
  readonly saving = signal(false);

  readonly fitnessDialogVisible = signal(false);
  readonly fitnessMemberId = signal<string | null>(null);
  readonly fitnessMemberName = signal('');
  readonly fitnessMemberGender = signal<'MALE' | 'FEMALE' | 'OTHER' | null>(null);
  readonly canWriteFitness = computed(() => this.permissions.canWrite('FITNESS'));

  readonly canWrite = computed(() => this.permissions.canWrite('MEMBERS'));
  readonly hasFilters = computed(() => !!this.search() || this.selectedBranchIds().length > 0 || this.selectedStatuses().length > 0 || this.ptOnly());
  readonly memberCards = computed(() => this.memberStore.members().map(m => buildMemberCard(m)));

  constructor() {
    effect(() => {
      this.search();
      this.selectedBranchIds();
      this.selectedStatuses();
      this.ptOnly();
      this.page();
      this.pageSize();
      this.fetchMembers();
    });
  }

  ngOnInit(): void {
    this.branchStore.ensureLoaded();
    this.employeeStore.ensureLoaded();
    this.planApi.list().subscribe({ next: p => this.plans.set(p) });
    this.offerApi.list().subscribe({ next: o => this.offers.set(o) });
    this.memberStore.loadAll();
  }

  fetchMembers(): void {
    this.memberStore.load({
      page: this.page(),
      pageSize: this.pageSize(),
      search: this.search() ? this.search().trim() : undefined,
      branchIds: this.selectedBranchIds().length ? this.selectedBranchIds() : undefined,
      statuses: this.selectedStatuses().length ? this.selectedStatuses() : undefined,
      hasPersonalTrainer: this.ptOnly() ? true : undefined,
    });
  }

  clearFilters(): void {
    this.search.set('');
    this.selectedBranchIds.set([]);
    this.selectedStatuses.set([]);
    this.ptOnly.set(false);
    this.page.set(1);
  }

  onPageChange(p: number): void {
    this.page.set(p);
  }

  onPageSizeChange(ps: number): void {
    this.pageSize.set(ps);
    this.page.set(1);
  }

  openCreate(): void {
    this.editingMember.set(null);
    this.planApi.list().subscribe({ next: p => this.plans.set(p) });
    this.offerApi.list().subscribe({ next: o => this.offers.set(o) });
    this.formModalVisible.set(true);
  }

  openEdit(member: Member): void {
    this.editingMember.set(member);
    this.planApi.list().subscribe({ next: p => this.plans.set(p) });
    this.offerApi.list().subscribe({ next: o => this.offers.set(o) });
    this.formModalVisible.set(true);
  }

  onSaveMember(event: { payload: MemberPayload; memberId?: string }): void {
    this.saving.set(true);
    const req$ = event.memberId
      ? this.memberApi.update(event.memberId, event.payload)
      : this.memberApi.create(event.payload);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.formModalVisible.set(false);
        this.toast.success(event.memberId ? 'Member profile updated.' : 'New member registered.');
        this.fetchMembers();
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Failed to save member.';
        this.toast.error(Array.isArray(msg) ? msg.join(' ') : msg);
      },
    });
  }

  openLogMetrics(member: Member): void {
    if (!member.heightCm) {
      this.toast.error('Member height is required before logging a check-in. Please edit the member to set their height.');
      return;
    }
    this.metricsMember.set(member);
  }

  onSaveMetrics(event: { payload: MetricEntryPayload; memberId?: string }): void {
    const memberId = event.memberId ?? this.metricsMember()?.id;
    if (!memberId) return;
    this.saving.set(true);
    this.memberApi.addMetricEntry(memberId, event.payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.metricsMember.set(null);
        this.toast.success('Check-in logged successfully.');
        this.fetchMembers();
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Failed to log check-in.';
        this.toast.error(Array.isArray(msg) ? msg.join(' ') : msg);
      },
    });
  }

  openFitnessDialog(member: Member): void {
    this.fitnessMemberId.set(member.id);
    this.fitnessMemberName.set(member.name);
    this.fitnessMemberGender.set(member.gender ?? null);
    this.fitnessDialogVisible.set(true);
  }

  downloadInvoice(member: Member): void {
    this.memberApi.downloadInvoicePdf(member.id).subscribe({
      next: (blob) => downloadInvoicePdf(member, blob),
      error: (err) => {
        const msg = err?.error?.message ?? 'Could not download invoice.';
        this.toast.error(Array.isArray(msg) ? msg.join(' ') : msg);
      },
    });
  }

  async deleteMember(member: Member): Promise<void> {
    const ok = await this.confirm.confirm({
      header: 'Delete Member',
      message: `Are you sure you want to delete ${member.name}? This cannot be undone.`,
      severity: 'danger',
      acceptLabel: 'Delete',
    });
    if (!ok) return;

    this.memberApi.remove(member.id).subscribe({
      next: () => {
        this.toast.success('Member removed successfully.');
        this.fetchMembers();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Could not delete member.';
        this.toast.error(Array.isArray(msg) ? msg.join(' ') : msg);
      },
    });
  }

  exportCsv(): void {
    const data = this.memberCards();
    if (!data.length) {
      this.toast.warn('No members to export.');
      return;
    }
    exportMembersToCsv(data);
  }
}

