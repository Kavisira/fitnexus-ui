import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ToastService } from '../../../core/toast/toast.service';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { Branch, BranchApiService, BranchPayload } from '../../../core/branches/branch-api.service';
import { CURRENCIES } from '../../../core/constants/currencies';
import { PermissionsService } from '../../../core/roles/permissions.service';

/**
 * Branches is the org's most-used screen, so it's deliberately a single
 * card-grid view rather than a plain data table — every branch is a
 * self-contained card showing all its key details at once (location,
 * contact, currency/tax, member count, main/status), arranged in a
 * responsive row-and-column grid so as many branches as possible are
 * visible without switching views. No table view, no manual list/table
 * toggle — one attractive, theme-consistent layout for everyone.
 *
 * There's no separate "branch name" field — Location (a free-text
 * description of where the branch is) is the identifying field, is
 * mandatory, and must be unique per organization. Address is a fully
 * separate, optional free-text field for extra detail.
 */
@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    InputNumberModule,
    SelectModule,
    TagModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
    CheckboxModule,
    TooltipModule,
    CardModule,
    AvatarModule,
    TranslatePipe,
  ],
  templateUrl: './branches.html',
  styleUrls: ['./branches.css'],
})
export class Branches implements OnInit {
  private fb = inject(FormBuilder);
  private branchApi = inject(BranchApiService);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private i18n = inject(TranslationService);
  private permissions = inject(PermissionsService);

  // Gates every add/edit/activate/deactivate action on this screen — the
  // server re-checks write access on each request regardless
  // (PermissionGuard), this just keeps the UI from offering actions
  // that would 403.
  canWrite = computed(() => this.permissions.canWrite('BRANCHES'));

  branches = signal<Branch[]>([]);
  loading = signal(false);
  saving = signal(false);
  dialogVisible = signal(false);
  editingId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  searchTerm = signal('');

  // Grid (default) — as many branches visible at once, arranged in
  // rows and columns. List — one full-width row per branch, showing
  // more detail per row at the cost of showing fewer at once.
  viewMode = signal<'grid' | 'list'>('grid');

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  filteredBranches = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const branches = this.branches();
    if (!term) {
      return branches;
    }
    return branches.filter((branch) =>
      [branch.location, branch.currency, branch.status]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  });

  // Creating the org's very first branch: it becomes the main branch
  // automatically, so the "Main branch" checkbox is hidden entirely
  // rather than asking a question with only one sensible answer. Once
  // at least one branch exists, every subsequent create/edit shows it.
  isCreatingFirstBranch = computed(() => !this.editingId() && this.branches().length === 0);

  languageOptions = [
    { label: 'English', value: 'en' },
    { label: 'தமிழ்', value: 'ta' },
  ];

  // Currency list lives in one shared constant (core/constants/currencies.ts)
  // rather than being hardcoded here, so the same options can be reused
  // anywhere else a currency needs to be picked (e.g. future billing screens).
  currencyOptions = CURRENCIES;

  form = this.fb.group({
    // The identifying field — free text, mandatory, unique per org
    // (enforced server-side; see BranchesService.assertUniqueLocation).
    location: ['', [Validators.required, Validators.minLength(3)]],
    // Fully separate free-text detail — always optional.
    address: [''],
    phone: [''],
    email: ['', [Validators.email]],
    // No dedicated field — always sent as UTC.
    timezone: ['UTC'],
    currency: ['INR', [Validators.required]],
    taxRatePercent: [null as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    defaultLanguage: ['en'],
    memberCount: [null as number | null, [Validators.required, Validators.min(0)]],
    isMainBranch: [false],
  });

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    this.loadBranches();
  }

  loadBranches(): void {
    this.loading.set(true);
    this.branchApi.list().subscribe({
      next: (branches) => {
        this.loading.set(false);
        this.branches.set(branches);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.i18n.t('branches.loadError'));
      },
    });
  }

  openCreate(): void {
    this.errorMessage.set(null);
    this.editingId.set(null);
    this.form.reset({
      location: '',
      address: '',
      phone: '',
      email: '',
      timezone: 'UTC',
      currency: 'INR',
      taxRatePercent: null,
      defaultLanguage: 'en',
      memberCount: null,
      isMainBranch: false,
    });
    this.dialogVisible.set(true);
  }

  openEdit(branch: Branch): void {
    this.errorMessage.set(null);
    this.editingId.set(branch.id);
    this.form.reset({
      location: branch.location,
      address: branch.address ?? '',
      phone: branch.phone ?? '',
      email: branch.email ?? '',
      timezone: branch.timezone,
      currency: branch.currency,
      taxRatePercent: Number(branch.taxRatePercent),
      defaultLanguage: branch.defaultLanguage,
      memberCount: branch.memberCount,
      isMainBranch: branch.isMainBranch,
    });
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
  }

  save(): void {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const raw = this.form.getRawValue();
    const payload: BranchPayload = {
      location: raw.location!,
      address: raw.address || undefined,
      phone: raw.phone || undefined,
      email: raw.email || undefined,
      timezone: raw.timezone || undefined,
      currency: raw.currency || undefined,
      taxRatePercent: raw.taxRatePercent!,
      defaultLanguage: raw.defaultLanguage || undefined,
      memberCount: raw.memberCount!,
      // Omitted (not sent as false) when this is the first branch —
      // the backend always makes it main regardless, so there's no
      // meaningful value to send here in that case.
      isMainBranch: this.isCreatingFirstBranch() ? undefined : !!raw.isMainBranch,
    };

    const editingId = this.editingId();
    const request = editingId ? this.branchApi.update(editingId, payload) : this.branchApi.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.toast.success(this.i18n.t(editingId ? 'branches.updatedSuccess' : 'branches.createdSuccess'));
        this.loadBranches();
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message ?? this.i18n.t('branches.saveError');
        this.errorMessage.set(Array.isArray(message) ? message.join(' ') : message);
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  async deactivate(branch: Branch): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      message: this.i18n.t('branches.deactivateConfirm'),
      header: this.i18n.t('branches.deactivateConfirmHeader'),
      acceptLabel: this.i18n.t('branches.deactivate'),
      severity: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.branchApi.deactivate(branch.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('branches.deactivatedSuccess'));
        // Re-pull the full list from the server rather than patching the
        // signal locally, so the grid always reflects the latest data
        // (ordering, any server-side side effects) after any status change.
        this.loadBranches();
      },
      error: (err) => {
        const message = err?.error?.message ?? this.i18n.t('branches.saveError');
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  activate(branch: Branch): void {
    this.branchApi.activate(branch.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('branches.activatedSuccess'));
        this.loadBranches();
      },
      error: (err) => {
        const message = err?.error?.message ?? this.i18n.t('branches.saveError');
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  // Single entry point the template's action icon calls — routes to
  // activate or deactivate based on the branch's current status, so any
  // status change (either direction) always re-fetches up-to-date data.
  toggleStatus(branch: Branch): void {
    if (branch.status === 'ACTIVE') {
      this.deactivate(branch);
    } else {
      this.activate(branch);
    }
  }

  /** First letter of the branch's location, for the avatar badge —
   * falls back to a generic glyph when location is empty. */
  initials(branch: Branch): string {
    return (branch.location || '?').trim().charAt(0).toUpperCase();
  }

  /** Card values should never render blank — anywhere a detail might be
   * missing (email, phone, tax rate, etc.), this turns it into a plain
   * "-" placeholder instead of empty space. */
  orDash(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return String(value);
  }
}
