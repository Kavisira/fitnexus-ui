import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ToastService } from '../../../core/toast/toast.service';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import {
  Employee,
  EmployeeActivity,
  EmployeeApiService,
  EmployeePayload,
  EmployeeRole,
  EmploymentStatus,
  GeneratedLogin,
} from '../../../core/employees/employee-api.service';
import { EmployeeStore } from '../../../core/employees/employee-store.service';
import { BranchStore } from '../../../core/branches/branch-store.service';
import { TokenStorage } from '../../../core/auth/token-storage.service';
import { PermissionsService } from '../../../core/roles/permissions.service';

type StatusSeverity = 'info' | 'success' | 'warn' | 'danger' | 'secondary';

const STATUS_SEVERITY: Record<EmploymentStatus, StatusSeverity> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
};

/**
 * Employees — single-branch staff records (manager/trainer/front-desk/
 * other), shown as the same card-grid/list-toggle pattern as Leads.
 * Clicking any employee opens a detail dialog that doubles as the edit
 * form, with a notes timeline underneath fed by EmployeeActivity.
 */
@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    InputNumberModule,
    TagModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule,
    CardModule,
    AvatarModule,
    TranslatePipe,
  ],
  templateUrl: './employees.html',
  styleUrls: ['./employees.css'],
})
export class Employees implements OnInit {
  private fb = inject(FormBuilder);
  private employeeApi = inject(EmployeeApiService);
  private employeeStore = inject(EmployeeStore);
  private branchStore = inject(BranchStore);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private i18n = inject(TranslationService);
  private tokenStorage = inject(TokenStorage);
  private permissions = inject(PermissionsService);

  // Drives whether the always-visible username/password block shows on
  // the detail dialog — only the owner can fetch credentials (server
  // enforces this too; this just avoids a pointless 403 round-trip for
  // everyone else).
  readonly isOwner = this.tokenStorage.isOwner();

  // Gates every add/edit/create action on this screen — the server
  // re-checks write access on each request regardless (PermissionGuard),
  // this just keeps the UI from offering actions that would 403.
  canWrite = computed(() => this.permissions.canWrite('EMPLOYEES'));

  // Reads straight from the shared store now instead of keeping a
  // local copy — this page is also the one place that mutates employee
  // data, so its own load/reload calls (below) keep the store current
  // for every other page reading it too (Attendance, Leads, Members).
  employees = this.employeeStore.employees;
  // Shared cache — see BranchStore; this page only ever wants ACTIVE branches.
  branches = this.branchStore.activeBranches;
  loading = this.employeeStore.loading;
  saving = signal(false);
  savingNote = signal(false);

  searchTerm = signal('');
  branchFilter = signal<string | null>(null);
  roleFilter = signal<string | null>(null);
  statusFilter = signal<string | null>(null);

  viewMode = signal<'grid' | 'list'>('grid');
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  createDialogVisible = signal(false);
  detailDialogVisible = signal(false);
  detailEmployee = signal<Employee | null>(null);
  errorMessage = signal<string | null>(null);
  noteText = signal('');

  detailsExpanded = signal(false);

  // Roles that can have a login — kept alongside roleOptions since the
  // "Create login" checkbox is disabled for a role that isn't eligible
  // (must mirror EmployeesService.LOGIN_ELIGIBLE_ROLE on the backend).
  private static readonly LOGIN_ELIGIBLE_ROLES: EmployeeRole[] = ['MANAGER', 'TRAINER', 'FRONT_DESK'];

  // Shows the auto-generated username/password exactly once right after
  // a login is created (create-with-checkbox or the retroactive
  // action) — the backend never returns the plaintext password again
  // after this, so it has to be captured here.
  generatedLogin = signal<GeneratedLogin | null>(null);
  creatingLogin = signal(false);

  // Owner-only, always-visible credentials on the detail dialog — fetched
  // fresh each time the dialog opens for an employee that already has a
  // login (see openDetail). null while loading/unavailable/not-owner;
  // loadingCredentials distinguishes "still fetching" from "none to show".
  employeeCredentials = signal<GeneratedLogin | null>(null);
  loadingCredentials = signal(false);
  credentialsError = signal<string | null>(null);

  isLoginEligibleRole(role: EmployeeRole | null | undefined): boolean {
    return !!role && Employees.LOGIN_ELIGIBLE_ROLES.includes(role);
  }

  roleOptions: { label: string; value: EmployeeRole }[] = [
    { label: 'Manager', value: 'MANAGER' },
    { label: 'Trainer', value: 'TRAINER' },
    { label: 'Front desk', value: 'FRONT_DESK' },
    { label: 'Other', value: 'OTHER' },
  ];

  statusOptions: { label: string; value: EmploymentStatus }[] = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  branchOptions = computed(() => this.branches().map((b) => ({ label: b.location, value: b.id })));
  branchFilterOptions = computed(() => [
    { label: this.i18n.t('employees.allBranches'), value: null },
    ...this.branchOptions(),
  ]);

  roleFilterOptions = computed(() => [{ label: this.i18n.t('employees.allRoles'), value: null }, ...this.roleOptions]);

  statusFilterOptions = computed(() => [
    { label: this.i18n.t('employees.allStatuses'), value: null },
    ...this.statusOptions,
  ]);

  hasActiveFilters = computed(
    () => !!this.searchTerm().trim() || !!this.branchFilter() || !!this.roleFilter() || !!this.statusFilter(),
  );

  clearFilters(): void {
    this.searchTerm.set('');
    this.branchFilter.set(null);
    this.roleFilter.set(null);
    this.statusFilter.set(null);
  }

  filteredEmployees = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const branchId = this.branchFilter();
    const role = this.roleFilter();
    const status = this.statusFilter();

    let employees = this.employees();
    if (branchId) {
      employees = employees.filter((e) => e.branchId === branchId);
    }
    if (role) {
      employees = employees.filter((e) => e.role === role);
    }
    if (status) {
      employees = employees.filter((e) => e.status === status);
    }
    if (!term) {
      return employees;
    }
    return employees.filter((employee) =>
      [employee.name, employee.phone, employee.email, employee.branch?.location]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  });

  createForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(5)]],
    email: ['', [Validators.email]],
    branchId: ['', [Validators.required]],
    role: ['OTHER' as EmployeeRole, [Validators.required]],
    joinDate: [new Date(), [Validators.required]],
    dateOfBirth: [null as Date | null],
    basicPay: [null as number | null],
    // Checking this requires dateOfBirth (username depends on it) and
    // only makes sense for a login-eligible role — both enforced in
    // saveCreate() below, not as static Validators, since they depend
    // on other fields' current values.
    createLogin: [false],
  });

  detailForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(5)]],
    email: ['', [Validators.email]],
    branchId: ['', [Validators.required]],
    role: ['OTHER' as EmployeeRole, [Validators.required]],
    status: ['ACTIVE' as EmploymentStatus],
    joinDate: [new Date(), [Validators.required]],
    dateOfBirth: [null as Date | null],
    basicPay: [null as number | null],
  });

  get cf() {
    return this.createForm.controls;
  }
  get df() {
    return this.detailForm.controls;
  }

  ngOnInit(): void {
    this.loadBranches();
    this.loadEmployees();
  }

  loadBranches(): void {
    this.branchStore.ensureLoaded();
  }

  loadEmployees(): void {
    this.employeeStore.reload(() => this.toast.error(this.i18n.t('employees.loadError')));
  }

  // ---- Create ----

  openCreate(): void {
    this.errorMessage.set(null);
    this.generatedLogin.set(null);
    this.createForm.reset({
      name: '',
      phone: '',
      email: '',
      branchId: '',
      role: 'OTHER',
      joinDate: new Date(),
      dateOfBirth: null,
      basicPay: null,
      createLogin: false,
    });
    this.createDialogVisible.set(true);
  }

  closeCreate(): void {
    this.createDialogVisible.set(false);
  }

  saveCreate(): void {
    this.errorMessage.set(null);
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const raw = this.createForm.getRawValue();

    if (raw.createLogin) {
      if (!raw.dateOfBirth) {
        this.errorMessage.set(this.i18n.t('employees.loginNeedsDob'));
        return;
      }
      if (!this.isLoginEligibleRole(raw.role)) {
        this.errorMessage.set(this.i18n.t('employees.loginNeedsEligibleRole'));
        return;
      }
    }

    this.saving.set(true);
    const payload: EmployeePayload = {
      name: raw.name!,
      phone: raw.phone!,
      email: raw.email || undefined,
      branchId: raw.branchId!,
      role: raw.role!,
      joinDate: raw.joinDate!.toISOString(),
      dateOfBirth: raw.dateOfBirth ? raw.dateOfBirth.toISOString() : undefined,
      basicPay: raw.basicPay != null ? String(raw.basicPay) : undefined,
      createLogin: raw.createLogin ?? false,
    };

    this.employeeApi.create(payload).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.createDialogVisible.set(false);
        this.toast.success(this.i18n.t('employees.createdSuccess'));
        this.loadEmployees();
        // Show the generated credentials once — the password is never
        // retrievable again after this (only its hash is stored).
        if (result.login) {
          this.generatedLogin.set(result.login);
        }
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message ?? this.i18n.t('employees.saveError');
        this.errorMessage.set(Array.isArray(message) ? message.join(' ') : message);
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  closeGeneratedLogin(): void {
    this.generatedLogin.set(null);
  }

  /** Retroactive login creation from the detail dialog, for an employee
   * that doesn't have one yet. */
  createLoginForEmployee(employee: Employee): void {
    if (!employee.dateOfBirth) {
      this.toast.error(this.i18n.t('employees.loginNeedsDob'));
      return;
    }
    if (!this.isLoginEligibleRole(employee.role)) {
      this.toast.error(this.i18n.t('employees.loginNeedsEligibleRole'));
      return;
    }

    this.creatingLogin.set(true);
    this.employeeApi.createLogin(employee.id).subscribe({
      next: (login) => {
        this.creatingLogin.set(false);
        this.generatedLogin.set(login);
        // Also fills the always-visible credentials block immediately —
        // no need to wait for a separate fetch when we already have it.
        this.employeeCredentials.set(login);
        this.employeeApi.get(employee.id).subscribe((fresh) => this.detailEmployee.set(fresh));
        this.loadEmployees();
      },
      error: (err) => {
        this.creatingLogin.set(false);
        const message = err?.error?.message ?? this.i18n.t('employees.saveError');
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  // ---- Detail / edit / timeline ----

  openDetail(employee: Employee): void {
    this.errorMessage.set(null);
    this.noteText.set('');
    this.detailsExpanded.set(false);
    this.detailEmployee.set(employee);
    this.detailDialogVisible.set(true);
    this.applyDetailForm(employee);
    this.employeeCredentials.set(null);
    this.credentialsError.set(null);

    this.employeeApi.get(employee.id).subscribe({
      next: (fresh) => {
        this.detailEmployee.set(fresh);
        this.applyDetailForm(fresh);
        this.loadCredentialsIfOwner(fresh);
      },
      error: () => this.toast.error(this.i18n.t('employees.loadError')),
    });
  }

  /** Fetches the always-visible username/password block — only called
   * when this.isOwner is true and the employee already has a login;
   * the backend re-checks the owner role regardless, this just avoids
   * firing a request that would 403 for everyone else. */
  private loadCredentialsIfOwner(employee: Employee): void {
    if (!this.isOwner || !employee.user) {
      return;
    }
    this.loadingCredentials.set(true);
    this.employeeApi.getCredentials(employee.id).subscribe({
      next: (credentials) => {
        this.loadingCredentials.set(false);
        this.employeeCredentials.set(credentials);
      },
      error: (err) => {
        this.loadingCredentials.set(false);
        const message = err?.error?.message ?? this.i18n.t('employees.credentialsUnavailable');
        this.credentialsError.set(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  private applyDetailForm(employee: Employee): void {
    this.detailForm.reset({
      name: employee.name,
      phone: employee.phone,
      email: employee.email ?? '',
      branchId: employee.branchId,
      role: employee.role,
      status: employee.status,
      joinDate: new Date(employee.joinDate),
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth) : null,
      basicPay: employee.basicPay != null ? Number(employee.basicPay) : null,
    });
  }

  closeDetail(): void {
    this.detailDialogVisible.set(false);
    this.detailEmployee.set(null);
    this.employeeCredentials.set(null);
    this.credentialsError.set(null);
  }

  saveDetail(): void {
    this.errorMessage.set(null);
    if (this.detailForm.invalid) {
      this.detailForm.markAllAsTouched();
      return;
    }

    const employee = this.detailEmployee();
    if (!employee) {
      return;
    }

    const raw = this.detailForm.getRawValue();
    this.saving.set(true);
    const payload: Partial<EmployeePayload> = {
      name: raw.name!,
      phone: raw.phone!,
      email: raw.email || undefined,
      branchId: raw.branchId!,
      role: raw.role!,
      status: raw.status!,
      joinDate: raw.joinDate!.toISOString(),
      dateOfBirth: raw.dateOfBirth ? raw.dateOfBirth.toISOString() : null,
      basicPay: raw.basicPay != null ? String(raw.basicPay) : null,
    };

    this.employeeApi.update(employee.id, payload).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.detailEmployee.set(updated);
        this.toast.success(this.i18n.t('employees.updatedSuccess'));
        this.loadEmployees();
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message ?? this.i18n.t('employees.saveError');
        this.errorMessage.set(Array.isArray(message) ? message.join(' ') : message);
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  addNote(): void {
    const employee = this.detailEmployee();
    const note = this.noteText().trim();
    if (!employee || !note) {
      return;
    }

    this.savingNote.set(true);
    this.employeeApi.addActivity(employee.id, note).subscribe({
      next: () => {
        this.savingNote.set(false);
        this.noteText.set('');
        this.employeeApi.get(employee.id).subscribe((fresh) => {
          this.detailEmployee.set(fresh);
          this.applyDetailForm(fresh);
        });
        this.loadEmployees();
      },
      error: () => {
        this.savingNote.set(false);
        this.toast.error(this.i18n.t('employees.noteError'));
      },
    });
  }

  async deleteEmployee(employee: Employee): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      message: this.i18n.t('employees.deleteConfirm'),
      header: this.i18n.t('employees.deleteConfirmHeader'),
      acceptLabel: this.i18n.t('common.delete'),
      severity: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.employeeApi.remove(employee.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('employees.deletedSuccess'));
        this.closeDetail();
        this.loadEmployees();
      },
      error: (err) => {
        const message = err?.error?.message ?? this.i18n.t('employees.saveError');
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  // ---- Display helpers ----

  initials(employee: Employee): string {
    return (employee.name || '?').trim().charAt(0).toUpperCase();
  }

  orDash(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return String(value);
  }

  roleLabel(role: EmployeeRole): string {
    return this.roleOptions.find((r) => r.value === role)?.label ?? role;
  }

  statusLabel(status: EmploymentStatus): string {
    return this.statusOptions.find((s) => s.value === status)?.label ?? status;
  }

  statusSeverity(status: EmploymentStatus): StatusSeverity {
    return STATUS_SEVERITY[status];
  }

  /** The list/card endpoints embed just the last few notes (see
   * EmployeesService.findAll) — this reads out just the latest one. */
  lastNote(employee: Employee): string | null {
    return employee.activities?.[0]?.note ?? null;
  }

  /** The last few notes (up to 4), most recent first — used by the
   * list-view card's recent-notes column. */
  recentNotes(employee: Employee): EmployeeActivity[] {
    return employee.activities ?? [];
  }
}
