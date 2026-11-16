import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';

import { BranchStore } from '../../../../core/branches/branch-store.service';
import { ConfirmService } from '../../../../core/confirm/confirm.service';
import {
  Employee,
  EmployeeApiService,
  EmployeePayload,
  EmployeeRole,
  EmploymentStatus,
  GeneratedLogin,
  JobTitle,
  UpdateEmployeePayload,
} from '../../../../core/employees/employee-api.service';
import { EmployeeStore } from '../../../../core/employees/employee-store.service';
import { Appraisal, CreateAppraisalPayload, CreateReviewPayload, PerformanceApiService, Review } from '../../../../core/performance/performance-api.service';
import { PermissionsService } from '../../../../core/roles/permissions.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { EmployeeFilterBarComponent } from './components/employee-filter-bar.component';
import { EmployeeTableComponent } from './components/employee-table.component';
import { EmployeeCardGridComponent } from './components/employee-card-grid.component';
import { EmployeeFormModalComponent } from './components/employee-form-modal.component';
import { EmployeeGeneratedLoginModalComponent } from './components/employee-generated-login-modal.component';
import { EmployeePerformanceModalComponent } from './components/employee-performance-modal.component';
import { EmployeeImportModalComponent } from './components/employee-import-modal.component';

@Component({
  selector: 'app-v2-employees-page',
  imports: [
    CommonModule, NzPaginationModule, EmployeeFilterBarComponent,
    EmployeeTableComponent, EmployeeCardGridComponent, EmployeeFormModalComponent,
    EmployeeGeneratedLoginModalComponent, EmployeePerformanceModalComponent, EmployeeImportModalComponent,
  ],
  templateUrl: './employees-page.component.html',
  host: { class: 'flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-full' },
})
export class V2EmployeesPageComponent implements OnInit {
  private employeeApi = inject(EmployeeApiService);
  private performanceApi = inject(PerformanceApiService);
  readonly employeeStore = inject(EmployeeStore);
  readonly branchStore = inject(BranchStore);
  private permissions = inject(PermissionsService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly canWrite = computed(() => this.permissions.canWrite('EMPLOYEES'));
  readonly branches = this.branchStore.activeBranches;
  readonly jobTitles = signal<JobTitle[]>([]);

  readonly search = signal('');
  readonly selectedBranchIds = signal<string[]>([]);
  readonly selectedRoles = signal<EmployeeRole[]>([]);
  readonly selectedStatuses = signal<EmploymentStatus[]>([]);
  readonly viewMode = signal<'table' | 'grid'>('table');

  readonly formModalVisible = signal(false);
  readonly editingEmployee = signal<Employee | null>(null);
  readonly saving = signal(false);
  readonly creatingLogin = signal(false);
  readonly generatedLogin = signal<GeneratedLogin | null>(null);

  readonly performanceModalVisible = signal(false);
  readonly performanceEmployee = signal<Employee | null>(null);
  readonly performanceReviews = signal<Review[]>([]);
  readonly performanceAppraisals = signal<Appraisal[]>([]);
  readonly performanceLoading = signal(false);
  readonly savingReview = signal(false);
  readonly savingAppraisal = signal(false);

  readonly importModalVisible = signal(false);

  readonly filteredEmployees = computed(() => {
    const list = this.employeeStore.employees();
    const term = this.search().trim().toLowerCase();
    const bIds = this.selectedBranchIds();
    const roles = this.selectedRoles();
    const statuses = this.selectedStatuses();
    return list.filter(e => {
      if (bIds.length > 0 && !bIds.includes(e.branchId)) return false;
      if (roles.length > 0 && !roles.includes(e.role)) return false;
      if (statuses.length > 0 && !statuses.includes(e.status)) return false;
      if (term && ![e.name, e.phone, e.email, e.branch?.location].filter(Boolean).some(v => v!.toLowerCase().includes(term))) return false;
      return true;
    });
  });

  readonly hasFilters = computed(() => Boolean(
    this.search().trim() ||
    this.selectedBranchIds().length > 0 ||
    this.selectedRoles().length > 0 ||
    this.selectedStatuses().length > 0
  ));

  readonly page = signal(1);
  readonly pageSize = signal(15);
  readonly paginatedEmployees = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredEmployees().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.branchStore.ensureLoaded();
    this.employeeStore.reload();
    this.employeeApi.listJobTitles().subscribe({ next: titles => this.jobTitles.set(titles) });
  }

  clearFilters(): void {
    this.search.set('');
    this.selectedBranchIds.set([]);
    this.selectedRoles.set([]);
    this.selectedStatuses.set([]);
  }

  openCreate(): void {
    this.editingEmployee.set(null);
    this.formModalVisible.set(true);
  }

  openEdit(emp: Employee): void {
    this.editingEmployee.set(emp);
    this.formModalVisible.set(true);
  }

  async onSaveEmployee(event: { payload: unknown; isEdit: boolean; employeeId?: string; credentialChanges?: string[] }): Promise<void> {
    if (event.isEdit && event.employeeId) {
      if (event.credentialChanges?.length) {
        const ok = await this.confirm.confirm({
          header: 'Regenerate Credentials',
          message: `Changing ${event.credentialChanges.join(', ')} will regenerate login credentials. Continue?`,
          acceptLabel: 'Continue',
        });
        if (!ok) return;
      }
      this.saving.set(true);
      this.employeeApi.update(event.employeeId, event.payload as UpdateEmployeePayload).subscribe({
        next: ({ login }) => {
          this.saving.set(false);
          this.formModalVisible.set(false);
          this.toast.success('Employee updated successfully.');
          this.employeeStore.reload();
          if (login) this.generatedLogin.set(login);
        },
        error: err => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Failed to update employee.'); },
      });
    } else {
      this.saving.set(true);
      this.employeeApi.create(event.payload as EmployeePayload).subscribe({
        next: result => {
          this.saving.set(false);
          this.formModalVisible.set(false);
          this.toast.success('Employee created successfully.');
          this.employeeStore.reload();
          if (result.login) this.generatedLogin.set(result.login);
        },
        error: err => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Failed to create employee.'); },
      });
    }
  }

  async deleteEmployee(emp: Employee): Promise<void> {
    const ok = await this.confirm.confirm({
      header: 'Delete Employee', message: `Are you sure you want to delete ${emp.name}? This action cannot be undone.`,
      severity: 'danger', acceptLabel: 'Delete',
    });
    if (!ok) return;
    this.employeeApi.remove(emp.id).subscribe({
      next: () => { this.toast.success('Employee deleted successfully.'); this.employeeStore.reload(); },
      error: err => { this.toast.error(err?.error?.message ?? 'Could not delete employee.'); },
    });
  }

  openPerformance(emp: Employee): void {
    this.performanceEmployee.set(emp);
    this.performanceModalVisible.set(true);
    this.loadPerformance(emp.id);
  }

  loadPerformance(id: string): void {
    this.performanceLoading.set(true);
    this.performanceApi.listReviews(id).subscribe({ next: r => this.performanceReviews.set(r) });
    this.performanceApi.listAppraisals(id).subscribe({
      next: a => { this.performanceLoading.set(false); this.performanceAppraisals.set(a); },
      error: () => this.performanceLoading.set(false),
    });
  }

  onCreateReview(payload: CreateReviewPayload): void {
    this.savingReview.set(true);
    this.performanceApi.createReview(payload).subscribe({
      next: () => { this.savingReview.set(false); this.toast.success('Review saved.'); this.loadPerformance(payload.employeeId); },
      error: () => { this.savingReview.set(false); this.toast.error('Could not save review.'); },
    });
  }

  onCreateAppraisal(payload: CreateAppraisalPayload): void {
    this.savingAppraisal.set(true);
    this.performanceApi.createAppraisal(payload).subscribe({
      next: () => {
        this.savingAppraisal.set(false);
        this.toast.success('Appraisal saved.');
        this.loadPerformance(payload.employeeId);
        this.employeeStore.reload();
      },
      error: () => { this.savingAppraisal.set(false); this.toast.error('Could not save appraisal.'); },
    });
  }

  onGenerateLogin(emp: Employee): void {
    this.creatingLogin.set(true);
    this.employeeApi.createLogin(emp.id).subscribe({
      next: login => {
        this.creatingLogin.set(false);
        this.generatedLogin.set(login);
        this.toast.success('Login created.');
        this.employeeStore.reload();
      },
      error: err => { this.creatingLogin.set(false); this.toast.error(err?.error?.message ?? 'Failed to generate login.'); },
    });
  }

  exportCsv(): void {
    const data = this.filteredEmployees();
    if (!data.length) { this.toast.warn('No employees to export.'); return; }
    const headers = ['Name', 'Phone', 'Email', 'Branch', 'Role', 'Status', 'JoinDate'];
    const rows = data.map(e => [e.name, e.phone, e.email || '', e.branch?.location || '', e.role, e.status, e.joinDate.slice(0, 10)]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Employees-Export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
