import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { Branch } from '../../../../../core/branches/branch-api.service';
import {
  EmployeeApiService,
  EmployeePayload,
  ImportedEmployeeRow,
} from '../../../../../core/employees/employee-api.service';
import { ToastService } from '../../../../../core/toast/toast.service';
import { downloadCsvTemplate, readFileAsText } from '../../../../../core/common/csv-browser.util';

interface ReviewRow {
  rowNumber: number;
  data: ImportedEmployeeRow['data'];
  errors: string[];
}

@Component({
  selector: 'app-employee-import-modal',
  imports: [CommonModule, FormsModule, NzModalModule, NzButtonModule, NzIconModule, NzSelectModule, NzTableModule, NzTagModule],
  template: `
    <nz-modal
      [nzVisible]="visible()"
      nzTitle="Import Employees from CSV"
      [nzFooter]="null"
      [nzWidth]="760"
      (nzOnCancel)="close.emit()"
    >
      <div *nzModalContent class="space-y-4 max-h-[75vh] overflow-y-auto p-1 text-xs">
        @if (step() === 'upload') {
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Target Branch *</label>
              <nz-select [(ngModel)]="selectedBranchId" [nzShowSearch]="true" nzPlaceHolder="Select branch" class="w-full !h-9">
                @for (b of branches(); track b.id) {
                  <nz-option [nzLabel]="b.location" [nzValue]="b.id"></nz-option>
                }
              </nz-select>
            </div>

            <div class="p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-center space-y-3">
              <span nz-icon nzType="upload" class="text-3xl text-gray-400"></span>
              <div>
                <p class="font-semibold text-gray-800 dark:text-gray-200 mb-0.5">Click to choose CSV file</p>
                <p class="text-gray-400 text-[11px] mb-0">Follow the required columns: Name, Phone, Email, Role, JoinDate, DateOfBirth, BasicPay</p>
              </div>
              <input type="file" accept=".csv" (change)="onFileSelected($event)" [disabled]="!selectedBranchId || uploading()" class="block mx-auto text-xs" />
            </div>

            <div class="flex items-center justify-between pt-2">
              <button nz-button nzType="text" (click)="downloadTemplate()" class="text-xs font-semibold flex items-center gap-1.5 text-blue-600">
                <span nz-icon nzType="download"></span> Download Sample Template
              </button>
              <button nz-button nzType="default" (click)="close.emit()" class="!rounded-xl">Cancel</button>
            </div>
          </div>
        }

        @if (step() === 'review') {
          <div class="space-y-3">
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-600 dark:text-gray-300 font-semibold">Found {{ rows().length }} rows ({{ submittableRows().length }} valid)</span>
              <button nz-button nzType="primary" (click)="commit()" [nzLoading]="committing()" [disabled]="selectedRows().length === 0" class="!rounded-xl text-xs font-semibold !bg-blue-600">
                Import {{ selectedRows().length }} Employees
              </button>
            </div>

            <nz-table #table [nzData]="rows()" [nzShowPagination]="false" [nzFrontPagination]="false" class="w-full">
              <thead>
                <tr class="text-xs uppercase text-gray-500 font-semibold bg-gray-50 dark:bg-gray-800/40">
                  <th class="py-2 px-3">Row</th>
                  <th class="py-2 px-3">Name</th>
                  <th class="py-2 px-3">Phone</th>
                  <th class="py-2 px-3">Role</th>
                  <th class="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody class="text-xs">
                @for (r of rows(); track r.rowNumber) {
                  <tr>
                    <td class="py-2 px-3">#{{ r.rowNumber }}</td>
                    <td class="py-2 px-3 font-semibold">{{ r.data.name }}</td>
                    <td class="py-2 px-3 text-gray-500">{{ r.data.phone }}</td>
                    <td class="py-2 px-3">{{ r.data.role }}</td>
                    <td class="py-2 px-3">
                      @if (r.errors.length > 0) {
                        <nz-tag nzColor="error">{{ r.errors.join(', ') }}</nz-tag>
                      } @else {
                        <nz-tag nzColor="success">Valid</nz-tag>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </nz-table>
          </div>
        }

        @if (step() === 'result') {
          <div class="space-y-4 text-center py-4">
            <div class="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold">✓</div>
            <h3 class="text-sm font-bold text-gray-900 dark:text-white">Import Complete</h3>
            <p class="text-gray-500">Successfully imported employees into the roster.</p>
            <button nz-button nzType="primary" (click)="close.emit()" class="!rounded-xl !bg-blue-600 font-semibold">Done</button>
          </div>
        }
      </div>
    </nz-modal>
  `,
})
export class EmployeeImportModalComponent {
  private api = inject(EmployeeApiService);
  private toast = inject(ToastService);

  readonly visible = input.required<boolean>();
  readonly branches = input.required<Branch[]>();

  readonly close = output<void>();
  readonly imported = output<void>();

  readonly step = signal<'upload' | 'review' | 'result'>('upload');
  selectedBranchId: string | null = null;
  readonly uploading = signal(false);
  readonly committing = signal(false);
  readonly rows = signal<ReviewRow[]>([]);
  readonly selectedRows = signal<ReviewRow[]>([]);
  readonly submittableRows = computed(() => this.rows().filter(r => r.errors.length === 0));

  downloadTemplate(): void {
    downloadCsvTemplate(
      'fitnexus-employees-template.csv',
      ['Name', 'Phone', 'Email', 'Role', 'JoinDate', 'DateOfBirth', 'BasicPay'],
      [['John Smith', '9876543210', 'john@example.com', 'TRAINER', '2026-09-01', '1990-02-15', '25000']]
    );
  }

  async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.selectedBranchId) return;
    this.uploading.set(true);
    try {
      const csv = await readFileAsText(file);
      this.api.parseImportCsv(this.selectedBranchId, csv).subscribe({
        next: res => {
          this.uploading.set(false);
          const parsed = res.rows.map(r => ({ rowNumber: r.rowNumber, data: r.data, errors: r.errors }));
          this.rows.set(parsed);
          this.selectedRows.set(parsed.filter(r => r.errors.length === 0));
          this.step.set('review');
        },
        error: () => { this.uploading.set(false); this.toast.error('Could not parse CSV file.'); },
      });
    } catch {
      this.uploading.set(false);
      this.toast.error('Could not read that file.');
    }
  }

  commit(): void {
    if (!this.selectedBranchId || this.selectedRows().length === 0) return;
    const branchId = this.selectedBranchId;
    const today = new Date().toISOString().slice(0, 10);
    const payload: EmployeePayload[] = this.selectedRows().map(r => ({
      branchId, name: r.data.name, phone: r.data.phone, email: r.data.email,
      role: r.data.role as EmployeePayload['role'], joinDate: r.data.joinDate || today,
      dateOfBirth: r.data.dateOfBirth, basicPay: r.data.basicPay || undefined,
    }));
    this.committing.set(true);
    this.api.commitImport(payload).subscribe({
      next: () => {
        this.committing.set(false);
        this.step.set('result');
        this.imported.emit();
      },
      error: () => { this.committing.set(false); this.toast.error('Import failed.'); },
    });
  }
}
