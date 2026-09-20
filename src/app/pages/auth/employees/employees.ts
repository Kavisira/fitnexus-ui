import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { EditorModule } from 'primeng/editor';
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
import { TableModule } from 'primeng/table';
import { MenuModule } from 'primeng/menu';
import { FilterPanel, FilterSection } from '../../../shared/filter-panel/filter-panel';
import { PageHeaderService } from '../../../shared/page-header/page-header.service';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ToastService } from '../../../core/toast/toast.service';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import {
  Employee,
  EmployeeApiService,
  EmployeePayload,
  EmployeeRole,
  EmploymentStatus,
  GeneratedLogin,
  JobTitle,
  SalaryComponent,
  SalaryComponentType,
} from '../../../core/employees/employee-api.service';
import { PerformanceApiService, Review, Appraisal } from '../../../core/performance/performance-api.service';
import { EmployeeStore } from '../../../core/employees/employee-store.service';
import { BranchStore } from '../../../core/branches/branch-store.service';
import { TokenStorage } from '../../../core/auth/token-storage.service';
import { PermissionsService } from '../../../core/roles/permissions.service';
import { EmployeesImport } from './employees-import';
import { MenuItem } from 'primeng/api';

type StatusSeverity = 'info' | 'success' | 'warn' | 'danger' | 'secondary';

const STATUS_SEVERITY: Record<EmploymentStatus, StatusSeverity> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
};

/**
 * Employees — single-branch staff records (manager/trainer/front-desk/
 * other), shown as the same card-grid/list-toggle pattern as Leads.
 * Clicking any employee opens a detail dialog that doubles as the edit
 * form, plus a collapsible login section and a Performance section
 * (reviews/appraisals, each their own popup).
 */
// Quill (the p-editor's underlying rich-text engine) reports an empty
// editor as HTML like "<p><br></p>", so a plain .trim() on the model
// value never sees it as blank — strip tags first to get the real text.
function richTextIsBlank(html: string): boolean {
  return !html?.replace(/<[^>]*>/g, '').trim();
}

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
    EditorModule,
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
    TableModule,
    MenuModule,
    EmployeesImport,
    FilterPanel,
    TranslatePipe,
  ],
  templateUrl: './employees.html',
  styleUrls: ['./employees.css'],
})
export class Employees implements OnInit {
  // Exposed for the template's [disabled] checks on the rich-text fields.
  readonly richTextIsBlank = richTextIsBlank;
  private fb = inject(FormBuilder);
  private employeeApi = inject(EmployeeApiService);
  private performanceApi = inject(PerformanceApiService);
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

  searchTerm = signal('');
  branchFilter = signal<string[]>([]);
  roleFilter = signal<EmployeeRole[]>([]);
  statusFilter = signal<EmploymentStatus[]>([]);

  selectedEmployees = signal<Employee[]>([]);

  viewMode = signal<'table' | 'list'>('table');
  setViewMode(mode: 'table' | 'list'): void {
    this.viewMode.set(mode);
  }

  // Per-row "..." actions menu — one shared p-menu, its [model] rebuilt
  // from whichever row's kebab button was last clicked (activeEmployee).
  // Same pattern as Members (pages/auth/members/members.ts).
  activeEmployee = signal<Employee | null>(null);
  menuItems = computed<MenuItem[]>(() => {
    const employee = this.activeEmployee();
    if (!employee) {
      return [];
    }
    const items: MenuItem[] = [
      {
        label: this.i18n.t(this.canWrite() ? 'leads.viewEdit' : 'common.view'),
        icon: 'pi pi-eye',
        command: () => this.openDetail(employee),
      },
    ];
    if (this.canWrite()) {
      items.push({ label: this.i18n.t('common.delete'), icon: 'pi pi-trash', command: () => this.deleteEmployee(employee) });
    }
    return items;
  });

  createDialogVisible = signal(false);
  detailDialogVisible = signal(false);
  detailEmployee = signal<Employee | null>(null);
  errorMessage = signal<string | null>(null);
  detailsExpanded = signal(false);
  loginSectionExpanded = signal(false);


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

  // Every employee is login-eligible now, whatever their job title —
  // the backend falls back to the generic STAFF permission role for
  // anything that isn't Manager/Trainer/Front Desk (see
  // EmployeesService.resolveUserRole). Kept as a method (rather than
  // inlining `!!role`) so the template reads the same as before.
  isLoginEligibleRole(role: EmployeeRole | null | undefined): boolean {
    return !!role;
  }

  // Managed per-org list backing the role dropdown — loaded once in
  // ngOnInit and re-fetched after creating a new title, so newly typed
  // titles (via the editable select — see employees.html) show up in
  // the list on the next open without a full page reload.
  jobTitles = signal<JobTitle[]>([]);

  roleOptions = computed<{ label: string; value: EmployeeRole }[]>(() =>
    this.jobTitles().map((jt) => ({ label: jt.name, value: jt.name })),
  );

  loadJobTitles(): void {
    this.employeeApi.listJobTitles().subscribe((list) => this.jobTitles.set(list));
  }

  statusOptions: { label: string; value: EmploymentStatus }[] = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  branchOptions = computed(() => this.branches().map((b) => ({ label: b.location, value: b.id })));
  branchFilterOptions = computed(() => this.branchOptions());
  roleFilterOptions = computed(() => this.roleOptions());
  statusFilterOptions = computed(() => this.statusOptions);

  filterSections = computed<FilterSection[]>(() => [
    { key: 'branch', label: this.i18n.t('employees.branchLabel'), options: this.branchFilterOptions() },
    { key: 'role', label: this.i18n.t('employees.roleLabel'), options: this.roleFilterOptions() },
    { key: 'status', label: this.i18n.t('employees.statusLabel'), options: this.statusFilterOptions() },
  ]);

  filterPanelValue = computed<Record<string, unknown[]>>(() => ({
    branch: this.branchFilter(),
    role: this.roleFilter(),
    status: this.statusFilter(),
  }));

  hasActiveFilters = computed(
    () =>
      !!this.searchTerm().trim() ||
      this.branchFilter().length > 0 ||
      this.roleFilter().length > 0 ||
      this.statusFilter().length > 0,
  );

  onFiltersApply(values: Record<string, unknown[]>): void {
    this.branchFilter.set((values['branch'] as string[]) ?? []);
    this.roleFilter.set((values['role'] as EmployeeRole[]) ?? []);
    this.statusFilter.set((values['status'] as EmploymentStatus[]) ?? []);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.branchFilter.set([]);
    this.roleFilter.set([]);
    this.statusFilter.set([]);
  }

  filteredEmployees = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const branchIds = this.branchFilter();
    const roles = this.roleFilter();
    const statuses = this.statusFilter();

    let employees = this.employees();
    if (branchIds.length > 0) {
      employees = employees.filter((e) => branchIds.includes(e.branchId));
    }
    if (roles.length > 0) {
      employees = employees.filter((e) => roles.includes(e.role));
    }
    if (statuses.length > 0) {
      employees = employees.filter((e) => statuses.includes(e.status));
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

  // Salary structure — a free-form list of percentage-of-basicPay lines,
  // entirely per-employee (see SalaryComponent model comment on the
  // backend). Kept as plain signals rather than a FormArray since each
  // row is only 3 simple fields and we never need per-field validation
  // messages, just the 0-100 range check the backend also enforces.
  createComponents = signal<SalaryComponent[]>([]);
  detailComponents = signal<SalaryComponent[]>([]);

  addComponent(target: 'create' | 'detail'): void {
    const list = target === 'create' ? this.createComponents : this.detailComponents;
    list.update((components) => [...components, { name: '', type: 'EARNING', percent: 0 }]);
  }

  removeComponent(target: 'create' | 'detail', index: number): void {
    const list = target === 'create' ? this.createComponents : this.detailComponents;
    list.update((components) => components.filter((_, i) => i !== index));
  }

  updateComponentField(
    target: 'create' | 'detail',
    index: number,
    field: 'name' | 'type' | 'percent',
    value: string,
  ): void {
    const list = target === 'create' ? this.createComponents : this.detailComponents;
    list.update((components) =>
      components.map((component, i) => {
        if (i !== index) {
          return component;
        }
        if (field === 'percent') {
          return { ...component, percent: value === '' ? 0 : Number(value) };
        }
        if (field === 'type') {
          return { ...component, type: value as SalaryComponentType };
        }
        return { ...component, name: value };
      }),
    );
  }

  // Plain method, not a computed signal — this app is zoneless and plain
  // methods referenced from a template are re-evaluated on every change
  // detection pass (see Header.profileMenuItems), so this stays in sync
  // with both the basicPay form control and the components signal
  // without any extra valueChanges wiring.
  netPayPreview(target: 'create' | 'detail'): number {
    const basicPay = Number(
      (target === 'create' ? this.createForm : this.detailForm).controls.basicPay.value ?? 0,
    );
    const components = target === 'create' ? this.createComponents() : this.detailComponents();
    let net = basicPay;
    for (const component of components) {
      const amount = (basicPay * Number(component.percent || 0)) / 100;
      net += component.type === 'DEDUCTION' ? -amount : amount;
    }
    return net;
  }

  private destroyRef = inject(DestroyRef);
  private pageHeader = inject(PageHeaderService);

  ngOnInit(): void {
    this.pageHeader.setTitleKey('employees.title');
    this.destroyRef.onDestroy(() => this.pageHeader.clear());
    this.loadBranches();
    this.loadEmployees();
    this.loadJobTitles();
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
    // New employees start with a blank salary structure — no template
    // inherited from role or branch.
    this.createComponents.set([]);
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
      components: this.createComponents(),
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
    this.detailsExpanded.set(false);
    this.loginSectionExpanded.set(false);
    this.detailEmployee.set(employee);
    this.detailDialogVisible.set(true);
    this.applyDetailForm(employee);
    this.employeeCredentials.set(null);
    this.credentialsError.set(null);
    this.loadPerformance(employee.id);

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
    this.detailComponents.set(employee.salaryComponents ?? []);
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
      components: this.detailComponents(),
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

  // ---- Performance: reviews (logged ad hoc, no fixed cadence) and
  // appraisals (a pay change + generated letter). Both ride on the
  // EMPLOYEES permission — see PerformanceController — same as the
  // rest of this screen. ----

  reviews = signal<Review[]>([]);
  appraisals = signal<Appraisal[]>([]);
  performanceLoading = signal(false);

  loadPerformance(employeeId: string): void {
    this.performanceLoading.set(true);
    this.performanceApi.listReviews(employeeId).subscribe({ next: (rows) => this.reviews.set(rows) });
    this.performanceApi.listAppraisals(employeeId).subscribe({
      next: (rows) => {
        this.performanceLoading.set(false);
        this.appraisals.set(rows);
      },
      error: () => this.performanceLoading.set(false),
    });
  }

  reviewDialogVisible = signal(false);
  reviewDate = signal<Date | null>(new Date());
  reviewRating = signal<number | null>(null);
  reviewNotes = signal('');
  savingReview = signal(false);

  ratingOptions = [1, 2, 3, 4, 5].map((n) => ({ label: '★'.repeat(n), value: n }));

  openReviewDialog(): void {
    this.reviewDate.set(new Date());
    this.reviewRating.set(null);
    this.reviewNotes.set('');
    this.reviewDialogVisible.set(true);
  }

  closeReviewDialog(): void {
    this.reviewDialogVisible.set(false);
  }

  submitReview(): void {
    const employee = this.detailEmployee();
    const date = this.reviewDate();
    const notes = this.reviewNotes();
    if (!employee || !date || richTextIsBlank(notes)) {
      return;
    }
    this.savingReview.set(true);
    this.performanceApi
      .createReview({
        employeeId: employee.id,
        reviewDate: date.toISOString().slice(0, 10),
        rating: this.reviewRating() ?? undefined,
        notes,
      })
      .subscribe({
        next: () => {
          this.savingReview.set(false);
          this.reviewDialogVisible.set(false);
          this.loadPerformance(employee.id);
        },
        error: () => {
          this.savingReview.set(false);
          this.toast.error(this.i18n.t('employees.performance.reviewError'));
        },
      });
  }

  appraisalDialogVisible = signal(false);
  appraisalDate = signal<Date | null>(new Date());
  appraisalNewBasicPay = signal<number | null>(null);
  appraisalNote = signal('');
  savingAppraisal = signal(false);

  openAppraisalDialog(): void {
    this.appraisalDate.set(new Date());
    this.appraisalNewBasicPay.set(this.detailEmployee()?.basicPay != null ? Number(this.detailEmployee()!.basicPay) : null);
    this.appraisalNote.set('');
    this.appraisalDialogVisible.set(true);
  }

  closeAppraisalDialog(): void {
    this.appraisalDialogVisible.set(false);
  }

  submitAppraisal(): void {
    const employee = this.detailEmployee();
    const date = this.appraisalDate();
    const newBasicPay = this.appraisalNewBasicPay();
    if (!employee || !date || newBasicPay == null) {
      return;
    }
    this.savingAppraisal.set(true);
    this.performanceApi
      .createAppraisal({
        employeeId: employee.id,
        effectiveDate: date.toISOString().slice(0, 10),
        newBasicPay: String(newBasicPay),
        note: this.appraisalNote() || undefined,
      })
      .subscribe({
        next: () => {
          this.savingAppraisal.set(false);
          this.appraisalDialogVisible.set(false);
          this.loadPerformance(employee.id);
          // The employee's basicPay just changed server-side — refresh
          // the detail form so the salary editor reflects it.
          this.employeeApi.get(employee.id).subscribe((fresh) => {
            this.detailEmployee.set(fresh);
            this.applyDetailForm(fresh);
          });
          this.loadEmployees();
        },
        error: () => {
          this.savingAppraisal.set(false);
          this.toast.error(this.i18n.t('employees.performance.appraisalError'));
        },
      });
  }

  ratingStars(rating: number | null): string {
    if (rating == null) return '';
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  trackReview(_index: number, review: Review): string {
    return review.id;
  }

  expandedAppraisalId = signal<string | null>(null);

  toggleAppraisal(id: string): void {
    this.expandedAppraisalId.update((current) => (current === id ? null : id));
  }

  trackAppraisal(_index: number, appraisal: Appraisal): string {
    return appraisal.id;
  }

  // ---- Reviews list popup and Appraisals list popup — two separate
  // dialogs (not stacked in the same section) so each stays clean, per
  // the product decision to keep Reviews and Appraisals visually
  // separate. Both are opened from the Performance action row. ----

  reviewsListDialogVisible = signal(false);
  appraisalsListDialogVisible = signal(false);

  openReviewsList(): void {
    this.reviewsListDialogVisible.set(true);
  }

  closeReviewsList(): void {
    this.reviewsListDialogVisible.set(false);
  }

  openAppraisalsList(): void {
    this.appraisalsListDialogVisible.set(true);
  }

  closeAppraisalsList(): void {
    this.appraisalsListDialogVisible.set(false);
  }

  reviewStatusSeverity(status: Review['status']): 'success' | 'warn' | 'info' {
    if (status === 'SIGNED_OFF') return 'success';
    if (status === 'PENDING_MANAGEMENT') return 'warn';
    return 'info';
  }

  // Management's reply draft, one per review, so multiple reviews in
  // the list can each hold in-progress text independently.
  reviewReplyDrafts = signal<Record<string, string>>({});
  sendingReplyReviewId = signal<string | null>(null);

  reviewReplyDraft(reviewId: string): string {
    return this.reviewReplyDrafts()[reviewId] ?? '';
  }

  setReviewReplyDraft(reviewId: string, value: string): void {
    this.reviewReplyDrafts.update((drafts) => ({ ...drafts, [reviewId]: value }));
  }

  sendManagementReply(review: Review): void {
    const message = this.reviewReplyDraft(review.id);
    const employee = this.detailEmployee();
    if (richTextIsBlank(message) || !employee) {
      return;
    }
    this.sendingReplyReviewId.set(review.id);
    this.performanceApi.replyAsManagement(review.id, message).subscribe({
      next: () => {
        this.sendingReplyReviewId.set(null);
        this.setReviewReplyDraft(review.id, '');
        this.loadPerformance(employee.id);
      },
      error: () => {
        this.sendingReplyReviewId.set(null);
        this.toast.error(this.i18n.t('employees.performance.reviewError'));
      },
    });
  }

  trackResponse(_index: number, response: Review['responses'][number]): string {
    return response.id;
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
    return this.roleOptions().find((r) => r.value === role)?.label ?? role;
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

}
