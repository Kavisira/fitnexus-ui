import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ToastService } from '../../../core/toast/toast.service';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import {
  Member,
  MemberApiService,
  MemberMetricEntry,
  MemberPayload,
  MemberStatus,
  MetricEntryPayload,
} from '../../../core/members/member-api.service';

import { Plan, PlanApiService, PlanDuration } from '../../../core/plans/plan-api.service';
import { Offer, OfferApiService } from '../../../core/offers/offer-api.service';
import { BranchStore } from '../../../core/branches/branch-store.service';
import { MemberStore } from '../../../core/members/member-store.service';
import { EmployeeStore } from '../../../core/employees/employee-store.service';
import { PermissionsService } from '../../../core/roles/permissions.service';
import { currencySymbol } from '../../../core/constants/currencies';
import { MEMBER_SOURCES } from '../../../core/constants/member-sources';
import { PAYMENT_MODES } from '../../../core/constants/payment-modes';
import { GENDERS, Gender } from '../../../core/constants/genders';
import { BLOOD_GROUPS } from '../../../core/constants/blood-groups';
import { BMI_STATUS_LABEL, BMI_STATUS_SEVERITY, bmiStatus, computeBmi } from '../../../core/constants/bmi';

/** Downscales/compresses an image file to a small JPEG data URL before
 * it's sent to the server — a phone photo straight out of the camera
 * can be several MB, which is both slow to upload and unnecessary for
 * a progress-comparison thumbnail. Capped at maxDim on the longer side. */
function compressImageToDataUrl(file: File, maxDim = 420, quality = 0.5): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read image.'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported.'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Plan duration → months added to startDate for endDate — kept in sync
 * with the same mapping in MembersService server-side; this copy is only
 * used for the live preview shown while filling the form, the server is
 * always the source of truth for what actually gets saved. */
function durationMonths(duration: PlanDuration | undefined): number {
  switch (duration) {
    case 'MONTHLY':
      return 1;
    case 'QUARTERLY':
      return 3;
    case 'ANNUAL':
      return 12;
    default:
      return 0;
  }
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Members — core record + plan/offer assignment (spec section 4, first
 * pass). A member belongs to exactly one home branch and one plan;
 * offers come from the independent org-wide catalog (see pages/auth/offers)
 * and, when applied, adjust the price and/or end date. startDate is the
 * only date typed directly (defaults to today, editable to a future
 * date for a member who's paid but joins later); endDate is always
 * computed and price is snapshotted at signup — neither is ever typed.
 * A COUPLE offer additionally needs a second member, either created
 * inline or linked from the existing list.
 */
@Component({
  selector: 'app-members',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    SelectButtonModule,
    DatePickerModule,
    MessageModule,
    TooltipModule,
    CardModule,
    TagModule,
    CheckboxModule,
    PaginatorModule,
    TranslatePipe,
  ],
  templateUrl: './members.html',
  styleUrls: ['./members.css'],
})
export class Members implements OnInit {
  private fb = inject(FormBuilder);
  private memberApi = inject(MemberApiService);
  private memberStore = inject(MemberStore);
  private planApi = inject(PlanApiService);
  private offerApi = inject(OfferApiService);
  private branchStore = inject(BranchStore);
  private employeeStore = inject(EmployeeStore);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private i18n = inject(TranslationService);
  private permissions = inject(PermissionsService);

  canWrite = computed(() => this.permissions.canWrite('MEMBERS'));

  currencySymbol = currencySymbol;
  sourceOptions = MEMBER_SOURCES;
  paymentModeOptions = PAYMENT_MODES;
  genderOptions = GENDERS;
  bloodGroupOptions = BLOOD_GROUPS;
  bmiStatusLabel = BMI_STATUS_LABEL;
  bmiStatusSeverity = BMI_STATUS_SEVERITY;

  // Data now lives in MemberStore (see its doc comment) — this page
  // still drives *when* to fetch (filters/page/search below), the
  // store just holds the resulting state and does the actual API
  // call, in case another page ever wants to reuse it.
  members = this.memberStore.members;
  // Full (unpaginated-ish, capped at 500) org roster — used ONLY for the
  // couple-partner picker dropdown and its price preview, which need to
  // search/select across every member, not just the currently-loaded
  // page of `members`. Kept deliberately separate from `members` so the
  // paginated list view is unaffected. Refreshed on init and after every
  // successful save (a newly created/edited member should be pickable
  // as a partner immediately).
  allMembers = this.memberStore.allMembers;
  // Shared cache — see BranchStore; this page only ever wants ACTIVE branches.
  branches = this.branchStore.activeBranches;
  plans = signal<Plan[]>([]);
  offers = signal<Offer[]>([]);
  // Shared cache — see EmployeeStore; reads the full list (INACTIVE included) same as before.
  employees = this.employeeStore.employees;
  loading = this.memberStore.loading;
  saving = signal(false);

  // ---- Pagination — Members used to fetch every member in the org in
  // one request and filter/search entirely in the browser; that's fine
  // for dozens of members but doesn't scale to a gym chain with
  // thousands (see the perf audit). Filtering now happens server-side
  // via loadMembers()'s query params, and the page only ever holds one
  // page's worth of rows. ----
  private readonly destroyRef = inject(DestroyRef);
  page = signal(1);
  readonly pageSize = 25;
  total = this.memberStore.total;

  searchTerm = signal('');
  branchFilter = signal<string | null>(null);
  statusFilter = signal<MemberStatus | null>(null);

  // Free-text search is debounced so every keystroke doesn't fire its
  // own request — branch/status filters (a discrete pick, not typing)
  // reload immediately instead, see onBranchFilterChange/onStatusFilterChange.
  private searchInput$ = new Subject<string>();

  viewMode = signal<'grid' | 'list'>('grid');
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  dialogVisible = signal(false);
  editingId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  partnerMode = signal<'new' | 'existing'>('new');

  statusOptions: { label: string; value: MemberStatus }[] = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  branchOptions = computed(() => this.branches().map((b) => ({ label: b.location, value: b.id })));
  branchFilterOptions = computed(() => [{ label: this.i18n.t('members.allBranches'), value: null }, ...this.branchOptions()]);
  statusFilterOptions = computed(() => [{ label: this.i18n.t('members.allStatuses'), value: null }, ...this.statusOptions]);

  hasActiveFilters = computed(() => !!this.searchTerm().trim() || !!this.branchFilter() || !!this.statusFilter());

  clearFilters(): void {
    this.searchTerm.set('');
    this.branchFilter.set(null);
    this.statusFilter.set(null);
    this.page.set(1);
    this.loadMembers();
  }

  // Called from the search input's (ngModelChange) — updates the
  // signal immediately (so the box itself feels responsive) but only
  // triggers a reload once typing pauses, via searchInput$'s debounce
  // wired up in ngOnInit.
  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.searchInput$.next(value);
  }

  onBranchFilterChange(branchId: string | null): void {
    this.branchFilter.set(branchId);
    this.page.set(1);
    this.loadMembers();
  }

  onStatusFilterChange(status: MemberStatus | null): void {
    this.statusFilter.set(status);
    this.page.set(1);
    this.loadMembers();
  }

  onPageChange(event: PaginatorState): void {
    this.page.set((event.page ?? 0) + 1); // PrimeNG's page is 0-based
    this.loadMembers();
  }

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  // ---- Profile photo (Add/Edit dialog) — separate from the reactive
  // form since it's a file input + async compress step, not a plain
  // value; same compressImageToDataUrl pipeline as the progress-photo
  // check-in flow below. null = no photo selected/unchanged from
  // whatever's already on the member; profilePhotoCleared distinguishes
  // "leave the existing photo alone" from "the user explicitly removed
  // it" when editing, since both look like "no new data URL" otherwise. ----
  profilePhotoDataUrl = signal<string | null>(null);
  profilePhotoProcessing = signal(false);
  profilePhotoCleared = signal(false);

  async onProfilePhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.toast.error(this.i18n.t('members.invalidPhoto'));
      return;
    }
    this.profilePhotoProcessing.set(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      this.profilePhotoDataUrl.set(dataUrl);
      this.profilePhotoCleared.set(false);
    } catch {
      this.toast.error(this.i18n.t('members.invalidPhoto'));
    } finally {
      this.profilePhotoProcessing.set(false);
      input.value = '';
    }
  }

  clearProfilePhoto(): void {
    this.profilePhotoDataUrl.set(null);
    this.profilePhotoCleared.set(true);
  }

    form = this.fb.group({
    branchId: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required]],
    email: [''],
    source: [null as string | null],
    planId: ['', [Validators.required]],
    offerId: [null as string | null],
    assignedTrainerEmployeeId: [null as string | null],
    paymentMode: [null as string | null],
    isTrial: [false],
    startDate: [new Date(), [Validators.required]],
    status: ['ACTIVE' as MemberStatus],
    dateOfBirth: [null as Date | null],
    gender: [null as Gender | null],
    bloodGroup: [null as string | null],
    heightCm: [null as number | null],
    goalWeightKg: [null as number | null],
  });

  partnerForm = this.fb.group({
    name: [''],
    phone: [''],
    email: [''],
  });

  get f() {
    return this.form.controls;
  }

  private formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  // Plans/trainers offered are scoped to whichever branch is currently
  // selected — a member can't be signed up to another branch's plan or
  // assigned another branch's trainer.
  branchPlans = computed(() => {
    const branchId = this.formValue()?.branchId;
    return this.plans().filter((p) => p.branchId === branchId);
  });
  branchTrainers = computed(() => {
    const branchId = this.formValue()?.branchId;
    return this.employees().filter((e) => e.branchId === branchId);
  });

  planOptions = computed(() => this.branchPlans().map((p) => ({ label: p.name, value: p.id })));
  trainerOptions = computed(() => this.branchTrainers().map((e) => ({ label: e.name, value: e.id })));
  offerOptions = computed(() => [
    { label: this.i18n.t('members.noOffer'), value: null },
    ...this.offers()
      .filter((o) => o.isActive)
      .map((o) => ({ label: o.name, value: o.id })),
  ]);

  // Existing members eligible to be linked as a couple partner — any
  // other member not already paired with someone.
  existingMemberOptions = computed(() => {
    const editingId = this.editingId();
    return this.allMembers()
      .filter((m) => m.id !== editingId && !m.partnerMemberId)
      .map((m) => ({ label: `${m.name} (${m.phone})`, value: m.id }));
  });

  selectedPlan = computed(() => this.branchPlans().find((p) => p.id === this.formValue()?.planId) ?? null);
  selectedOffer = computed(() => this.offers().find((o) => o.id === this.formValue()?.offerId) ?? null);
  selectedBranch = computed(() => this.branches().find((b) => b.id === this.formValue()?.branchId) ?? null);
  isCoupleOffer = computed(() => this.selectedOffer()?.type === 'COUPLE');

  endDatePreview = computed(() => {
    const value = this.formValue();
    const plan = this.selectedPlan();
    if (!plan || !value?.startDate) {
      return null;
    }
    const offer = this.selectedOffer();
    const extraMonths = offer?.type === 'EXTRA_DURATION' ? offer.extraMonths ?? 0 : 0;
    return addMonths(new Date(value.startDate), durationMonths(plan.duration) + extraMonths);
  });

  pricePreview = computed(() => {
    const plan = this.selectedPlan();
    if (!plan) {
      return null;
    }
    const basePrice = Number(plan.price);
    const offer = this.selectedOffer();
    let price = basePrice;
    if (offer?.type === 'PERCENT_DISCOUNT') {
      price = Math.max(0, basePrice * (1 - Number(offer.percentValue) / 100));
    } else if (offer?.type === 'FLAT_DISCOUNT') {
      price = Math.max(0, basePrice - Number(offer.flatAmount));
    }
    const branch = this.selectedBranch();
    const symbol = currencySymbol(branch?.currency);
    return `${symbol}${price.toFixed(2)}`;
  });

  partnerPricePreview = computed(() => {
    const offer = this.selectedOffer();
    if (offer?.type !== 'COUPLE') {
      return null;
    }
    const discountPercent = Number(offer.percentValue ?? 0);
    const branch = this.selectedBranch();
    const symbol = currencySymbol(branch?.currency);

    if (this.partnerMode() === 'existing') {
      const partnerId = this.partnerMemberIdValue();
      const existing = this.allMembers().find((m) => m.id === partnerId);
      if (!existing) {
        return null;
      }
      const price = Math.max(0, Number(existing.price) * (1 - discountPercent / 100));
      return `${symbol}${price.toFixed(2)}`;
    }

    const plan = this.selectedPlan();
    if (!plan) {
      return null;
    }
    const price = Math.max(0, Number(plan.price) * (1 - discountPercent / 100));
    return `${symbol}${price.toFixed(2)}`;
  });

  partnerMemberIdControl = this.fb.control<string | null>(null);
  private partnerMemberIdValue = toSignal(this.partnerMemberIdControl.valueChanges, {
    initialValue: this.partnerMemberIdControl.value,
  });

  ngOnInit(): void {
    this.loadBranches();
    this.loadPlans();
    this.loadOffers();
    this.loadEmployees();
    this.loadMembers();
    this.loadAllMembers();

    this.searchInput$.pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.page.set(1);
      this.loadMembers();
    });
  }

  loadBranches(): void {
    this.branchStore.ensureLoaded();
  }

  loadPlans(): void {
    this.planApi.list().subscribe({ next: (plans) => this.plans.set(plans) });
  }

  loadOffers(): void {
    this.offerApi.list().subscribe({ next: (offers) => this.offers.set(offers) });
  }

  loadEmployees(): void {
    this.employeeStore.ensureLoaded();
  }

  loadMembers(): void {
    this.memberStore.load(
      {
        branchId: this.branchFilter(),
        status: this.statusFilter(),
        search: this.searchTerm().trim() || undefined,
        page: this.page(),
        pageSize: this.pageSize,
      },
      () => this.toast.error(this.i18n.t('members.loadError')),
    );
  }

  // Fetches the (capped) full org roster for the couple-partner picker —
  // see the `allMembers` doc comment above.
  loadAllMembers(): void {
    this.memberStore.loadAll();
  }

  openCreate(): void {
    this.errorMessage.set(null);
    this.editingId.set(null);
    this.partnerMode.set('new');
    this.form.reset({
      branchId: this.branches().length === 1 ? this.branches()[0].id : '',
      name: '',
      phone: '',
      email: '',
      source: null,
      planId: '',
      offerId: null,
      assignedTrainerEmployeeId: null,
      paymentMode: null,
      isTrial: false,
      startDate: new Date(),
      status: 'ACTIVE',
      dateOfBirth: null,
      gender: null,
      bloodGroup: null,
      heightCm: null,
      goalWeightKg: null,
    });
    this.partnerForm.reset({ name: '', phone: '', email: '' });
    this.partnerMemberIdControl.reset(null);
    this.profilePhotoDataUrl.set(null);
    this.profilePhotoCleared.set(false);
    this.dialogVisible.set(true);
  }

  openEdit(member: Member): void {
    this.errorMessage.set(null);
    this.editingId.set(member.id);
    this.partnerMode.set('new');
    this.form.reset({
      branchId: member.branchId,
      name: member.name,
      phone: member.phone,
      email: member.email ?? '',
      source: member.source,
      planId: member.planId ?? '',
      offerId: member.offerId,
      assignedTrainerEmployeeId: member.assignedTrainerEmployeeId,
      paymentMode: member.paymentMode,
      isTrial: member.isTrial,
      startDate: new Date(member.startDate),
      status: member.status,
      dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth) : null,
      gender: member.gender,
      bloodGroup: member.bloodGroup,
      heightCm: member.heightCm !== null ? Number(member.heightCm) : null,
      goalWeightKg: member.goalWeightKg !== null ? Number(member.goalWeightKg) : null,
    });
    this.profilePhotoDataUrl.set(member.photoUrl ?? null);
    this.profilePhotoCleared.set(false);
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

    const raw = this.form.getRawValue();
    const isCouple = this.isCoupleOffer();
    const editingId = this.editingId();

    if (!editingId && isCouple) {
      if (this.partnerMode() === 'new') {
        const partner = this.partnerForm.getRawValue();
        if (!partner.name || !partner.phone) {
          this.errorMessage.set(this.i18n.t('members.partnerRequired'));
          return;
        }
      } else if (!this.partnerMemberIdControl.value) {
        this.errorMessage.set(this.i18n.t('members.partnerRequired'));
        return;
      }
    }

    this.saving.set(true);
    const payload: MemberPayload = {
      branchId: raw.branchId!,
      name: raw.name!,
      phone: raw.phone!,
      email: raw.email || undefined,
      photoDataUrl: this.profilePhotoCleared() ? '' : (this.profilePhotoDataUrl() ?? undefined),
      source: raw.source ?? undefined,
      planId: raw.planId!,
      offerId: raw.offerId ?? undefined,
      assignedTrainerEmployeeId: raw.assignedTrainerEmployeeId ?? undefined,
      paymentMode: raw.paymentMode ?? undefined,
      isTrial: raw.isTrial ?? false,
      startDate: (raw.startDate as unknown as Date).toISOString(),
      status: raw.status ?? 'ACTIVE',
      dateOfBirth: raw.dateOfBirth ? (raw.dateOfBirth as unknown as Date).toISOString() : undefined,
      gender: raw.gender ?? undefined,
      bloodGroup: raw.bloodGroup ?? undefined,
      heightCm: raw.heightCm ?? undefined,
      goalWeightKg: raw.goalWeightKg ?? undefined,
      ...(!editingId && isCouple && this.partnerMode() === 'new'
        ? {
            partnerNew: {
              name: this.partnerForm.value.name!,
              phone: this.partnerForm.value.phone!,
              email: this.partnerForm.value.email || undefined,
            },
          }
        : {}),
      ...(!editingId && isCouple && this.partnerMode() === 'existing'
        ? { partnerMemberId: this.partnerMemberIdControl.value! }
        : {}),
    };

    const request = editingId ? this.memberApi.update(editingId, payload) : this.memberApi.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.toast.success(this.i18n.t(editingId ? 'members.updatedSuccess' : 'members.createdSuccess'));
        this.loadMembers();
        this.loadAllMembers();
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message ?? this.i18n.t('members.saveError');
        this.errorMessage.set(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  async remove(member: Member): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      message: this.i18n.t('members.deleteConfirm'),
      header: this.i18n.t('members.deleteConfirmHeader'),
      acceptLabel: this.i18n.t('common.delete'),
      severity: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.memberApi.remove(member.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('members.deletedSuccess'));
        this.loadMembers();
      },
      error: (err) => {
        const message = err?.error?.message ?? this.i18n.t('members.saveError');
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  // ---- Health profile / BMI / monthly check-ins + photo compare ----

  metricsDialogVisible = signal(false);
  metricsMember = signal<Member | null>(null);
  metricsSaving = signal(false);
  metricsError = signal<string | null>(null);
  metricsPhotoDataUrl = signal<string | null>(null);
  metricsPhotoProcessing = signal(false);

  metricsForm = this.fb.group({
    weightKg: [null as number | null, [Validators.required, Validators.min(1)]],
    chestCm: [null as number | null],
    waistCm: [null as number | null],
    hipsCm: [null as number | null],
    recordedAt: [new Date(), [Validators.required]],
  });

  progressDialogVisible = signal(false);
  progressMember = signal<Member | null>(null);
  progressHistory = signal<MemberMetricEntry[]>([]);
  progressLoading = signal(false);

  // Every check-in that has a photo, oldest first — shown all together
  // in one scrollable strip so progress across every month is visible
  // at a glance, not just a single before/after pair.
  entriesWithPhoto = computed(() => this.progressHistory().filter((e) => !!e.photoUrl));

  /** progressHistory() enriched with the week-over-week deltas the plain
   * history rows don't carry on their own — computed once here so the
   * table can just bind to numbers/signs instead of recomputing per
   * cell. weightDelta/bmiDelta are null for the very first entry
   * (nothing to compare against). */
  progressRows = computed(() => {
    const rows = this.progressHistory();
    return rows.map((entry, idx) => {
      const prev = idx > 0 ? rows[idx - 1] : null;
      const weightDelta = prev ? Number(entry.weightKg) - Number(prev.weightKg) : null;
      const bmiDelta = prev ? Number(entry.bmi) - Number(prev.bmi) : null;
      return { entry, index: idx, weightDelta, bmiDelta };
    });
  });

  // Memoized per-page view model for the member cards — previously the
  // template called age()/memberPrice()/latestEntry()/orDash() directly
  // per member, per change-detection cycle (harmless at small scale, but
  // real waste now that this page is doing more re-renders with
  // pagination/search). This computed only re-derives when `members()`
  // itself changes (i.e. once per page load), and the template reads
  // the precomputed labels instead of calling methods inline.
  memberCards = computed(() =>
    this.members().map((member) => {
      const latest = this.latestEntry(member);
      return {
        member,
        ageLabel: this.age(member),
        priceLabel: this.memberPrice(member),
        latest,
        branchLabel: this.orDash(member.branch?.location),
        planLabel: this.orDash(member.plan?.name),
        emailLabel: this.orDash(member.email),
        sourceLabel: this.orDash(member.source),
        paymentModeLabel: this.orDash(member.paymentMode),
        bloodGroupLabel: this.orDash(member.bloodGroup),
      };
    }),
  );

  age(member: Member): string {
    if (!member.dateOfBirth) {
      return '-';
    }
    const dob = new Date(member.dateOfBirth);
    const now = new Date();
    let years = now.getFullYear() - dob.getFullYear();
    const hasHadBirthdayThisYear =
      now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
    if (!hasHadBirthdayThisYear) {
      years -= 1;
    }
    return `${years}`;
  }

  latestEntry(member: Member): MemberMetricEntry | null {
    return member.metricEntries?.[0] ?? null;
  }

  openLogMetrics(member: Member): void {
    if (!member.heightCm) {
      this.toast.error(this.i18n.t('members.heightRequiredForMetrics'));
      return;
    }
    this.metricsError.set(null);
    this.metricsMember.set(member);
    this.metricsPhotoDataUrl.set(null);
    const latest = this.latestEntry(member);
    this.metricsForm.reset({
      weightKg: latest ? Number(latest.weightKg) : null,
      chestCm: latest?.chestCm ? Number(latest.chestCm) : null,
      waistCm: latest?.waistCm ? Number(latest.waistCm) : null,
      hipsCm: latest?.hipsCm ? Number(latest.hipsCm) : null,
      recordedAt: new Date(),
    });
    this.metricsDialogVisible.set(true);
  }

  closeMetricsDialog(): void {
    this.metricsDialogVisible.set(false);
  }

  async onMetricsPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.toast.error(this.i18n.t('members.invalidPhoto'));
      input.value = '';
      return;
    }
    this.metricsPhotoProcessing.set(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      this.metricsPhotoDataUrl.set(dataUrl);
    } catch {
      this.toast.error(this.i18n.t('members.invalidPhoto'));
    } finally {
      this.metricsPhotoProcessing.set(false);
      input.value = '';
    }
  }

  clearMetricsPhoto(): void {
    this.metricsPhotoDataUrl.set(null);
  }

  metricsBmiPreview = toSignal(this.metricsForm.valueChanges, { initialValue: this.metricsForm.getRawValue() });

  metricsPreviewText = computed(() => {
    const member = this.metricsMember();
    const value = this.metricsBmiPreview();
    if (!member?.heightCm || !value?.weightKg) {
      return null;
    }
    const bmi = computeBmi(Number(value.weightKg), Number(member.heightCm));
    return `${this.i18n.t('members.bmiLabel')}: ${bmi} — ${this.i18n.t('members.bmiStatus.' + bmiStatus(bmi))}`;
  });

  saveMetricEntry(): void {
    this.metricsError.set(null);
    if (this.metricsForm.invalid) {
      this.metricsForm.markAllAsTouched();
      return;
    }
    const member = this.metricsMember();
    if (!member) {
      return;
    }
    const raw = this.metricsForm.getRawValue();
    const payload: MetricEntryPayload = {
      weightKg: raw.weightKg!,
      chestCm: raw.chestCm ?? undefined,
      waistCm: raw.waistCm ?? undefined,
      hipsCm: raw.hipsCm ?? undefined,
      recordedAt: (raw.recordedAt as unknown as Date).toISOString(),
      photoDataUrl: this.metricsPhotoDataUrl() ?? undefined,
    };

    this.metricsSaving.set(true);
    this.memberApi.addMetricEntry(member.id, payload).subscribe({
      next: () => {
        this.metricsSaving.set(false);
        this.metricsDialogVisible.set(false);
        this.toast.success(this.i18n.t('members.checkinSaved'));
        this.loadMembers();
        if (this.progressMember()?.id === member.id) {
          this.loadProgressHistory(member.id);
        }
      },
      error: (err) => {
        this.metricsSaving.set(false);
        const message = err?.error?.message ?? this.i18n.t('members.saveError');
        this.metricsError.set(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  openProgress(member: Member): void {
    this.progressMember.set(member);
    this.progressDialogVisible.set(true);
    this.loadProgressHistory(member.id);
  }

  closeProgressDialog(): void {
    this.progressDialogVisible.set(false);
  }

  private loadProgressHistory(memberId: string): void {
    this.progressLoading.set(true);
    this.memberApi.listMetricEntries(memberId).subscribe({
      next: (entries) => {
        this.progressLoading.set(false);
        this.progressHistory.set(entries);
        // Keep the member (and its embedded "latest" entry) in sync too,
        // in case this history load followed a brand-new check-in. The
        // member being viewed is usually on the current page, but under
        // pagination it may not be — fall back to the full roster fetch,
        // and if neither has it (edge case), just leave progressMember
        // as-is rather than clearing it.
        const refreshed = this.members().find((m) => m.id === memberId) ?? this.allMembers().find((m) => m.id === memberId);
        if (refreshed) {
          this.progressMember.set(refreshed);
        }
      },
      error: () => {
        this.progressLoading.set(false);
        this.toast.error(this.i18n.t('members.loadError'));
      },
    });
  }

  /** "1st", "2nd", "3rd", "4th"... for labeling each logged check-in in
   * order — used both on the progress-photo compare strip and the
   * check-in history table so every entry reads as "1st review",
   * "2nd review", etc. instead of just a bare date. */
  reviewLabel(index: number): string {
    const n = index + 1;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) {
      return `${n}th`;
    }
    switch (n % 10) {
      case 1:
        return `${n}st`;
      case 2:
        return `${n}nd`;
      case 3:
        return `${n}rd`;
      default:
        return `${n}th`;
    }
  }

  memberBmiLabel(member: Member): string {
    const latest = this.latestEntry(member);
    if (!latest) {
      return '-';
    }
    return `${latest.bmi}`;
  }

  memberPrice(member: Member): string {
    const symbol = currencySymbol(member.branch?.currency);
    return `${symbol}${Number(member.price).toFixed(2)}`;
  }

  orDash(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return String(value);
  }
}
