import { Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';

import { ToastService } from '../../../core/toast/toast.service';
import { BranchStore } from '../../../core/branches/branch-store.service';
import { EmployeeStore } from '../../../core/employees/employee-store.service';
import { PlanApiService, Plan } from '../../../core/plans/plan-api.service';
import { OfferApiService, Offer } from '../../../core/offers/offer-api.service';
import { MemberApiService, MemberPayload, ImportedMemberRow, ImportCommitResultRow } from '../../../core/members/member-api.service';
import { downloadCsvTemplate, readFileAsText } from '../../../core/common/csv-browser.util';

/** A parsed CSV row plus whatever Plan/Offer/Trainer has been assigned
 * to it so far from the review screen (undefined = not assigned yet). */
interface ReviewRow {
  rowNumber: number;
  data: ImportedMemberRow['data'];
  errors: string[];
  planId?: string;
  planName?: string;
  offerId?: string | null;
  offerName?: string;
  trainerId?: string | null;
  trainerName?: string;
}

type Step = 'branch' | 'upload' | 'review' | 'result';

/**
 * Bulk-import Members from a CSV file.
 *
 * Deliberately a two-step "parse, review, commit" flow rather than
 * inserting rows as they're read — the CSV template has no Plan/Offer/
 * Trainer columns (each member in a file can need a different one, and
 * a plan is required for a Member to exist at all — see the Prisma
 * schema), so nothing is saved to the database until every row has a
 * plan assigned here on the review screen and Save is clicked. Couple
 * offers aren't supported in bulk import (see offerOptions below) —
 * they need a partner selection that doesn't fit a flat per-row import.
 *
 * Opened by the parent (Members page) via the `open()` method through a
 * template reference variable, not an [(visible)] binding — there's no
 * existing precedent in this codebase for a two-way-bound dialog
 * component, so this follows the same "parent calls a method, child
 * emits an event when done" shape as everything else here.
 */
@Component({
  selector: 'app-members-import',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, SelectModule, TableModule, TagModule, MessageModule],
  templateUrl: './members-import.html',
  styleUrls: ['./members-import.css'],
})
export class MembersImport {
  private toast = inject(ToastService);
  private branchStore = inject(BranchStore);
  private employeeStore = inject(EmployeeStore);
  private planApi = inject(PlanApiService);
  private offerApi = inject(OfferApiService);
  private memberApi = inject(MemberApiService);

  @Output() imported = new EventEmitter<void>();

  visible = signal(false);
  step = signal<Step>('branch');

  branches = this.branchStore.activeBranches;
  branchOptions = computed(() => this.branches().map((b) => ({ label: b.location, value: b.id })));
  selectedBranchId = signal<string | null>(null);

  private plans = signal<Plan[]>([]);
  private offers = signal<Offer[]>([]);
  branchPlans = computed(() => this.plans().filter((p) => p.branchId === this.selectedBranchId()));
  branchTrainers = computed(() => this.employeeStore.employees().filter((e) => e.branchId === this.selectedBranchId()));
  planOptions = computed(() => this.branchPlans().map((p) => ({ label: p.name, value: p.id })));
  trainerOptions = computed(() => [
    { label: '— No trainer —', value: null },
    ...this.branchTrainers().map((e) => ({ label: e.name, value: e.id })),
  ]);
  // Couple offers aren't supported here — see the class doc comment.
  offerOptions = computed(() => [
    { label: '— No offer —', value: null },
    ...this.offers()
      .filter((o) => o.isActive && o.type !== 'COUPLE')
      .map((o) => ({ label: o.name, value: o.id })),
  ]);

  uploading = signal(false);
  rows = signal<ReviewRow[]>([]);
  selectedRows = signal<ReviewRow[]>([]);

  batchDialogVisible = signal(false);
  batchPlanId = signal<string | null>(null);
  batchOfferId = signal<string | null>(null);
  batchTrainerId = signal<string | null>(null);

  // A row is only submittable once it parsed with no errors AND has a
  // plan assigned — Plan is mandatory for a Member to exist at all.
  submittableRows = computed(() => this.rows().filter((r) => r.errors.length === 0));
  unassignedCount = computed(() => this.submittableRows().filter((r) => !r.planId).length);
  errorRowCount = computed(() => this.rows().length - this.submittableRows().length);
  canSave = computed(() => this.submittableRows().length > 0 && this.unassignedCount() === 0);

  committing = signal(false);
  results = signal<ImportCommitResultRow[] | null>(null);
  successCount = computed(() => (this.results() ?? []).filter((r) => r.success).length);
  failureCount = computed(() => (this.results() ?? []).filter((r) => !r.success).length);

  open(): void {
    this.step.set('branch');
    this.selectedBranchId.set(null);
    this.rows.set([]);
    this.selectedRows.set([]);
    this.results.set(null);
    if (this.plans().length === 0) {
      this.planApi.list().subscribe({ next: (plans) => this.plans.set(plans) });
    }
    if (this.offers().length === 0) {
      this.offerApi.list().subscribe({ next: (offers) => this.offers.set(offers) });
    }
    this.employeeStore.ensureLoaded();
    this.visible.set(true);
  }

  close(): void {
    this.visible.set(false);
  }

  continueToUpload(): void {
    if (!this.selectedBranchId()) {
      this.toast.error('Select a branch first.');
      return;
    }
    this.step.set('upload');
  }

  downloadTemplate(): void {
    downloadCsvTemplate(
      'fitnexus-members-template.csv',
      ['Name', 'Phone', 'Email', 'DateOfBirth', 'Gender', 'BloodGroup', 'HeightCm', 'GoalWeightKg', 'StartDate', 'Status', 'Source', 'PaymentMode'],
      [['Jane Doe', '9876543210', 'jane@example.com', '1995-04-12', 'FEMALE', 'O+', '165', '60', '2026-09-01', 'ACTIVE', 'Walk-in', 'Cash']],
    );
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const branchId = this.selectedBranchId();
    if (!branchId) {
      return;
    }
    this.uploading.set(true);
    try {
      const csvContent = await readFileAsText(file);
      this.memberApi.parseImportCsv(branchId, csvContent).subscribe({
        next: (result) => {
          this.uploading.set(false);
          this.rows.set(result.rows.map((r) => ({ rowNumber: r.rowNumber, data: r.data, errors: r.errors })));
          this.step.set('review');
        },
        error: (err) => {
          this.uploading.set(false);
          this.toast.error(err?.error?.message ?? 'Could not read that file.');
        },
      });
    } catch {
      this.uploading.set(false);
      this.toast.error('Could not read that file.');
    } finally {
      input.value = '';
    }
  }

  openBatchAssign(): void {
    if (this.selectedRows().length === 0) {
      this.toast.error('Select at least one row first.');
      return;
    }
    this.batchPlanId.set(null);
    this.batchOfferId.set(null);
    this.batchTrainerId.set(null);
    this.batchDialogVisible.set(true);
  }

  applyBatchAssign(): void {
    const planId = this.batchPlanId();
    if (!planId) {
      this.toast.error('Select a plan for the selected rows.');
      return;
    }
    const plan = this.branchPlans().find((p) => p.id === planId);
    const offerId = this.batchOfferId();
    const offer = offerId ? this.offers().find((o) => o.id === offerId) : null;
    const trainerId = this.batchTrainerId();
    const trainer = trainerId ? this.branchTrainers().find((e) => e.id === trainerId) : null;
    const selectedNumbers = new Set(this.selectedRows().map((r) => r.rowNumber));

    this.rows.update((all) =>
      all.map((r) =>
        selectedNumbers.has(r.rowNumber)
          ? { ...r, planId, planName: plan?.name, offerId, offerName: offer?.name, trainerId, trainerName: trainer?.name }
          : r,
      ),
    );
    this.selectedRows.set([]);
    this.batchDialogVisible.set(false);
  }

  save(): void {
    const branchId = this.selectedBranchId();
    if (!branchId || !this.canSave()) {
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const payload: MemberPayload[] = this.submittableRows().map((r) => ({
      branchId,
      name: r.data.name,
      phone: r.data.phone,
      email: r.data.email,
      dateOfBirth: r.data.dateOfBirth,
      gender: r.data.gender as MemberPayload['gender'],
      bloodGroup: r.data.bloodGroup,
      heightCm: r.data.heightCm,
      goalWeightKg: r.data.goalWeightKg,
      // Defaulted here (not left to the backend) so every submitted row
      // always has a valid date — see the class doc comment on why the
      // whole batch must be DTO-valid, not just business-rule-valid.
      startDate: r.data.startDate || today,
      status: (r.data.status as MemberPayload['status']) ?? 'ACTIVE',
      source: r.data.source,
      paymentMode: r.data.paymentMode,
      planId: r.planId!,
      offerId: r.offerId ?? undefined,
      assignedTrainerEmployeeId: r.trainerId ?? undefined,
    }));

    this.committing.set(true);
    this.memberApi.commitImport(payload).subscribe({
      next: (result) => {
        this.committing.set(false);
        this.results.set(result.results);
        this.step.set('result');
        this.imported.emit();
      },
      error: (err) => {
        this.committing.set(false);
        this.toast.error(err?.error?.message ?? 'Import failed.');
      },
    });
  }

  finish(): void {
    this.visible.set(false);
  }
}
