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
import {
  EmployeeApiService,
  EmployeePayload,
  ImportedEmployeeRow,
  EmployeeImportCommitResultRow,
} from '../../../core/employees/employee-api.service';
import { downloadCsvTemplate, readFileAsText } from '../../../core/common/csv-browser.util';

interface ReviewRow {
  rowNumber: number;
  data: ImportedEmployeeRow['data'];
  errors: string[];
}

type Step = 'branch' | 'upload' | 'review' | 'result';

/**
 * Bulk-import Employees from a CSV file.
 *
 * Simpler than MembersImport (see members-import.ts) — Employees has no
 * Plan/Offer/Trainer concept, so there's no per-row batch-assign step:
 * rows parse straight from the CSV (Role, JoinDate, etc. are plain
 * columns) and the user can deselect any unwanted rows before one Save.
 * Login creation is deliberately NOT offered here — bulk-generating and
 * exposing auto-created passwords for a whole roster is a security
 * concern, so bulkCreate() on the backend always forces createLogin:
 * false; anyone needing a login gets one created individually afterward.
 *
 * Same "parent calls open(), child emits an event" shape as
 * MembersImport — no [(visible)] binding precedent in this codebase.
 */
@Component({
  selector: 'app-employees-import',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, SelectModule, TableModule, TagModule, MessageModule],
  templateUrl: './employees-import.html',
  styleUrls: ['./employees-import.css'],
})
export class EmployeesImport {
  private toast = inject(ToastService);
  private branchStore = inject(BranchStore);
  private employeeApi = inject(EmployeeApiService);

  @Output() imported = new EventEmitter<void>();

  visible = signal(false);
  step = signal<Step>('branch');

  branches = this.branchStore.activeBranches;
  branchOptions = computed(() => this.branches().map((b) => ({ label: b.location, value: b.id })));
  selectedBranchId = signal<string | null>(null);

  uploading = signal(false);
  rows = signal<ReviewRow[]>([]);
  selectedRows = signal<ReviewRow[]>([]);

  submittableRows = computed(() => this.rows().filter((r) => r.errors.length === 0));
  errorRowCount = computed(() => this.rows().length - this.submittableRows().length);
  canSave = computed(() => this.selectedRows().length > 0);

  committing = signal(false);
  results = signal<EmployeeImportCommitResultRow[] | null>(null);
  successCount = computed(() => (this.results() ?? []).filter((r) => r.success).length);
  failureCount = computed(() => (this.results() ?? []).filter((r) => !r.success).length);

  open(): void {
    this.step.set('branch');
    this.selectedBranchId.set(null);
    this.rows.set([]);
    this.selectedRows.set([]);
    this.results.set(null);
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
      'fitnexus-employees-template.csv',
      ['Name', 'Phone', 'Email', 'Role', 'JoinDate', 'DateOfBirth', 'BasicPay'],
      [['John Smith', '9876543210', 'john@example.com', 'TRAINER', '2026-09-01', '1990-02-15', '25000']],
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
      this.employeeApi.parseImportCsv(branchId, csvContent).subscribe({
        next: (result) => {
          this.uploading.set(false);
          const parsed = result.rows.map((r) => ({ rowNumber: r.rowNumber, data: r.data, errors: r.errors }));
          this.rows.set(parsed);
          // Pre-select every error-free row so a clean file needs no
          // extra clicks before Save — matches "deselect what you don't
          // want" rather than "select what you do".
          this.selectedRows.set(parsed.filter((r) => r.errors.length === 0));
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

  save(): void {
    const branchId = this.selectedBranchId();
    if (!branchId || !this.canSave()) {
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const selectedNumbers = new Set(this.selectedRows().map((r) => r.rowNumber));
    const payload: EmployeePayload[] = this.submittableRows()
      .filter((r) => selectedNumbers.has(r.rowNumber))
      .map((r) => ({
        branchId,
        name: r.data.name,
        phone: r.data.phone,
        email: r.data.email,
        role: r.data.role as EmployeePayload['role'],
        joinDate: r.data.joinDate || today,
        dateOfBirth: r.data.dateOfBirth,
        basicPay: r.data.basicPay || undefined,
      }));

    this.committing.set(true);
    this.employeeApi.commitImport(payload).subscribe({
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
