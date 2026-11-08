import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';
import { TableLazyLoadEvent } from 'primeng/table';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
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
import { TableModule } from 'primeng/table';

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
  PtDuration,
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
import { BMI_STATUS_LABEL, BMI_STATUS_SEVERITY, BmiStatus, TagSeverity, bmiStatus, computeBmi } from '../../../core/constants/bmi';
import { MembersImport } from './members-import';
import { FilterPanel, FilterSection } from '../../../shared/filter-panel/filter-panel';
import { PageHeaderService } from '../../../shared/page-header/page-header.service';
import { MemberFitnessDialog } from './member-fitness-dialog/member-fitness-dialog';

/** Row shape produced by memberCards() below — named so the
 * actions-menu / details-dialog state (which needs the whole row, not
 * just the raw Member, since the details dialog shows the precomputed
 * labels too) has something to type against instead of `any`. */
interface MemberCard {
  member: Member;
  ageLabel: string;
  priceLabel: string;
  latest: MemberMetricEntry | null;
  branchLabel: string;
  planLabel: string;
  emailLabel: string;
  sourceLabel: string;
  paymentModeLabel: string;
  bloodGroupLabel: string;
}


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

/** PT duration → months — kept in sync with ptDurationMonths() in
 * MembersService server-side, same "preview only" caveat as
 * durationMonths() above. */
function ptDurationMonths(duration: PtDuration | null | undefined): number {
  switch (duration) {
    case 'MONTHLY':
      return 1;
    case 'QUARTERLY':
      return 3;
    case 'HALF_YEARLY':
      return 6;
    case 'YEARLY':
      return 12;
    default:
      return 0;
  }
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
    TableModule,
    MenuModule,
    PaginatorModule,
    MembersImport,
    FilterPanel,
    TranslatePipe,
    MemberFitnessDialog,
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

  // The p-table row template's `let-card` is untyped (any), so indexing
  // BMI_STATUS_SEVERITY directly with `latest.bmiStatus` in the template
  // trips noImplicitAny under strict template checking — this gives the
  // template a properly-typed lookup instead.
  bmiSeverity(status: BmiStatus): TagSeverity {
    return this.bmiStatusSeverity[status];
  }

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
  private pageHeader = inject(PageHeaderService);
  page = signal(1);
  readonly pageSize = 25;
  total = this.memberStore.total;

  searchTerm = signal('');
  branchFilter = signal<string[]>([]);
  statusFilter = signal<MemberStatus[]>([]);
  // Single-option multi-select ('true' or empty) rather than a plain
  // boolean, so it plugs into the same generic FilterPanel section
  // shape as branch/status — see filterSections()/onFiltersApply().
  ptFilter = signal<string[]>([]);

  // Free-text search is debounced so every keystroke doesn't fire its
  // own request — branch/status filters (picked from the filter panel,
  // not typing) reload immediately on Apply/Clear instead, see
  // onFiltersApply/clearFilters.
  private searchInput$ = new Subject<string>();

  selectedMembers = signal<Member[]>([]);

  viewMode = signal<'table' | 'list'>('table');
  setViewMode(mode: 'table' | 'list'): void {
    this.viewMode.set(mode);
  }

  // Per-row "..." actions menu — one shared p-menu (see members.html),
  // its [model] rebuilt from whichever row's kebab button was last
  // clicked (activeCard). Same shared-menu pattern as the header's
  // profile menu (shared/header/header.ts).
  // ---- Sorting — the table is only ever holding one server-paginated
  // page (25 rows, see the pagination note above), so a full backend
  // sort endpoint would be overkill; this sorts whatever's currently on
  // screen. Switching pages resets it implicitly since sortedCards()
  // re-derives from memberCards() every time the page's data changes. ----
  sortField = signal<'name' | 'plan' | 'trainer' | 'status' | null>(null);
  sortOrder = signal<1 | -1>(1);

  toggleSort(field: 'name' | 'plan' | 'trainer' | 'status'): void {
    if (this.sortField() === field) {
      this.sortOrder.set(this.sortOrder() === 1 ? -1 : 1);
    } else {
      this.sortField.set(field);
      this.sortOrder.set(1);
    }
  }

  private sortValue(card: MemberCard, field: 'name' | 'plan' | 'trainer' | 'status'): string {
    switch (field) {
      case 'name':
        return card.member.name ?? '';
      case 'plan':
        return card.planLabel ?? '';
      case 'trainer':
        return card.member.assignedTrainerEmployee?.name ?? '';
      case 'status':
        return card.member.status ?? '';
    }
  }

  sortedCards = computed(() => {
    const field = this.sortField();
    const cards = this.memberCards();
    if (!field) {
      return cards;
    }
    const order = this.sortOrder();
    return [...cards].sort((a, b) => this.sortValue(a, field).localeCompare(this.sortValue(b, field)) * order);
  });

  activeCard = signal<MemberCard | null>(null);
  menuItems = computed<MenuItem[]>(() => {
    const card = this.activeCard();
    if (!card) {
      return [];
    }
    const member = card.member;
    const items: MenuItem[] = [
      { label: this.i18n.t('members.detailsLabel'), icon: 'pi pi-info-circle', command: () => this.openDetails(card) },
      { label: this.i18n.t('members.viewProgress'), icon: 'pi pi-eye', command: () => this.openProgress(member) },
      { label: 'Diet & workout', icon: 'pi pi-heart', command: () => this.openFitnessDialog(member) },
    ];
    if (this.canWrite()) {
      items.push(
        { label: this.i18n.t('members.logCheckin'), icon: 'pi pi-plus-circle', command: () => this.openLogMetrics(member) },
        { separator: true },
        { label: this.i18n.t('plans.edit'), icon: 'pi pi-pencil', command: () => this.openEdit(member) },
        { label: this.i18n.t('plans.delete'), icon: 'pi pi-trash', command: () => this.remove(member) },
      );
    }
    return items;
  });

  // Details dialog — everything the old member cards (and the now-
  // trimmed table columns) used to show at a glance: branch, offer,
  // duration, price, trainer, email, source, payment mode, blood
  // group, age, BMI.
  detailsDialogVisible = signal(false);
  openDetails(card: MemberCard): void {
    this.activeCard.set(card);
    this.detailsDialogVisible.set(true);
  }

  dialogVisible = signal(false);
  editingId = signal<string | null>(null);
  // The member being edited, kept around only so showSettleBalance /
  // hasInvoice can see its stored amountPaid & isTrial without
  // re-fetching — reset on openCreate/openEdit, same lifetime as
  // editingId.
  editingMember = signal<Member | null>(null);
  errorMessage = signal<string | null>(null);
  partnerMode = signal<'new' | 'existing'>('new');

  // ---- Add/Edit wizard — 4 steps: Personal info, Membership details,
  // Payment, Measurements. Editing an existing member jumps straight
  // into the wizard same as creating, just pre-filled; nothing about
  // the step flow itself differs between add/edit. ----
  wizardSteps: { label: string; icon: string }[] = [
    { label: 'Personal', icon: 'pi-user' },
    { label: 'Membership', icon: 'pi-building' },
    { label: 'Payment', icon: 'pi-wallet' },
    { label: 'Measurements', icon: 'pi-chart-line' },
  ];
  wizardStep = signal(0);

  goToStep(index: number): void {
    // Editing an existing member: every field already came from a
    // valid, saved record, so there's nothing forward navigation
    // could skip past that wasn't already valid — free jump to any
    // step directly, no need to click through Next each time. Any
    // edit that breaks validity is still caught at save() (see
    // save()'s form.invalid check), which also jumps back to the
    // first invalid step so the error is visible.
    //
    // Creating a new member: only allow jumping backward (or to the
    // current step) by clicking a step chip directly — forward
    // navigation always goes through nextStep() so each step's own
    // fields get validated before moving on.
    if (this.editingId() || index <= this.wizardStep()) {
      this.errorMessage.set(null);
      this.wizardStep.set(index);
    }
  }

  /** Marks just the controls relevant to the given step as touched —
   * so an invalid field surfaces its error immediately on "Next"
   * without force-touching (and visually erroring) fields on later
   * steps the person hasn't reached yet. */
  private touchControls(names: string[]): void {
    for (const name of names) {
      this.form.get(name)?.markAsTouched();
    }
  }

  private stepValid(step: number): boolean {
    switch (step) {
      case 0:
        this.touchControls(['name', 'phone']);
        return !this.f.name.invalid && !this.f.phone.invalid;
      case 1:
        this.touchControls(['branchId', 'planId', 'startDate', 'assignedTrainerEmployeeId']);
        if (this.f.branchId.invalid || this.f.planId.invalid || this.f.startDate.invalid) {
          return false;
        }
        // Personal Training requires an assigned trainer — checked
        // here (not just via the control's own Validators, since
        // requiredness depends on the checkbox) so it surfaces at
        // this same step, not later on the Payment step.
        if (this.f.hasPersonalTrainer.value && !this.f.assignedTrainerEmployeeId.value) {
          return false;
        }
        if (!this.editingId() && this.isCoupleOffer()) {
          if (this.partnerMode() === 'new') {
            const partner = this.partnerForm.getRawValue();
            if (!partner.name || !partner.phone) {
              this.errorMessage.set(this.i18n.t('members.partnerRequired'));
              return false;
            }
          } else if (!this.partnerMemberIdControl.value) {
            this.errorMessage.set(this.i18n.t('members.partnerRequired'));
            return false;
          }
        }
        return true;
      case 2: {
        this.touchControls(['paymentMode', 'amountPaid', 'paymentFollowUpDate', 'ptStartDate', 'ptDuration', 'ptRatePerMonth']);
        if (this.f.paymentMode.invalid) {
          return false;
        }
        if (this.amountPaidInvalid()) {
          return false;
        }
        if (this.f.hasPersonalTrainer.value) {
          if (!this.f.ptStartDate.value || !this.f.ptDuration.value || this.f.ptRatePerMonth.value === null || this.f.ptRatePerMonth.value === undefined) {
            return false;
          }
          if (this.ptDurationExceedsMembership()) {
            this.errorMessage.set(this.i18n.t('members.ptDurationExceedsMembership'));
            return false;
          }
        }
        return true;
      }
      default:
        return true;
    }
  }

  nextStep(): void {
    this.errorMessage.set(null);
    if (!this.stepValid(this.wizardStep())) {
      // stepValid() already set a more specific message for a couple-
      // offer partner requirement; everything else is a plain missing/
      // invalid mandatory field, so fall back to a generic prompt —
      // the field(s) themselves are now touched (see touchControls
      // inside stepValid) so their inline .field-error text is showing
      // too, not just this banner.
      if (!this.errorMessage()) {
        this.errorMessage.set(this.i18n.t('members.requiredFieldsError'));
      }
      return;
    }
    this.wizardStep.set(Math.min(this.wizardStep() + 1, this.wizardSteps.length - 1));
  }

  prevStep(): void {
    this.wizardStep.set(Math.max(this.wizardStep() - 1, 0));
  }

  // 'FULL' keeps amountPaid in lockstep with the price preview (so the
  // payload always sends the full computed price when not partial,
  // without the person having to type it); switching to 'PARTIAL'
  // leaves whatever they type alone.
  paymentType = signal<'FULL' | 'PARTIAL'>('FULL');
  setPaymentType(type: 'FULL' | 'PARTIAL'): void {
    this.paymentType.set(type);
    if (type === 'FULL') {
      this.form.patchValue({ amountPaid: null, paymentFollowUpDate: null });
    }
  }

  // Diet & workout dialog (see MemberFitnessDialog)
  fitnessDialogVisible = signal(false);
  fitnessMemberId = signal<string | null>(null);
  fitnessMemberName = signal('');
  fitnessMemberGender = signal<'MALE' | 'FEMALE' | 'OTHER' | null>(null);
  canWriteFitness = computed(() => this.permissions.canWrite('FITNESS'));

  openFitnessDialog(member: Member): void {
    this.fitnessMemberId.set(member.id);
    this.fitnessMemberName.set(member.name);
    this.fitnessMemberGender.set(member.gender ?? null);
    this.fitnessDialogVisible.set(true);
  }

  statusOptions: { label: string; value: MemberStatus }[] = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  ptDurationOptions: { label: string; value: PtDuration }[] = [
    { label: 'Monthly', value: 'MONTHLY' },
    { label: 'Quarterly', value: 'QUARTERLY' },
    { label: 'Half-yearly', value: 'HALF_YEARLY' },
    { label: 'Yearly', value: 'YEARLY' },
  ];

  branchOptions = computed(() => this.branches().map((b) => ({ label: b.location, value: b.id })));
  branchFilterOptions = computed(() => this.branchOptions());
  statusFilterOptions = computed(() => this.statusOptions);

  ptFilterOptions = computed(() => [{ label: this.i18n.t('members.hasPersonalTrainerLabel'), value: 'true' }]);

  filterSections = computed<FilterSection[]>(() => [
    { key: 'branch', label: this.i18n.t('members.branchLabel'), options: this.branchFilterOptions() },
    { key: 'status', label: this.i18n.t('members.statusLabel'), options: this.statusFilterOptions() },
    { key: 'personalTrainer', label: this.i18n.t('members.ptFilterLabel'), options: this.ptFilterOptions() },
  ]);

  filterPanelValue = computed<Record<string, unknown[]>>(() => ({
    branch: this.branchFilter(),
    status: this.statusFilter(),
    personalTrainer: this.ptFilter(),
  }));

  hasActiveFilters = computed(
    () =>
      !!this.searchTerm().trim() ||
      this.branchFilter().length > 0 ||
      this.statusFilter().length > 0 ||
      this.ptFilter().length > 0,
  );

  onFiltersApply(values: Record<string, unknown[]>): void {
    this.branchFilter.set((values['branch'] as string[]) ?? []);
    this.statusFilter.set((values['status'] as MemberStatus[]) ?? []);
    this.ptFilter.set((values['personalTrainer'] as string[]) ?? []);
    this.page.set(1);
    this.loadMembers();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.branchFilter.set([]);
    this.statusFilter.set([]);
    this.ptFilter.set([]);
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


  // p-table's built-in paginator (replacing the standalone grid +
  // p-paginator pair — same server-side pagination underneath, just a
  // more compact control bundled with the table itself). Guarded so the
  // paginator's own onLazyLoad firing on init (lazyLoadOnInit defaults
  // to true) doesn't trigger a second, redundant fetch on top of
  // ngOnInit's loadMembers() call.
  onLazyLoad(event: TableLazyLoadEvent): void {
    const newPage = Math.floor((event.first ?? 0) / this.pageSize) + 1;
    if (newPage === this.page()) {
      return;
    }
    this.page.set(newPage);
    this.loadMembers();
  }

  // p-paginator below the restored card-based list view (see
  // viewMode) — separate from onLazyLoad above since p-paginator's
  // event shape (0-based `.page`) differs from p-table's own
  // TableLazyLoadEvent (`.first`), but both drive the same
  // page()/loadMembers() server-side pagination underneath.
  onListPageChange(event: PaginatorState): void {
    this.page.set((event.page ?? 0) + 1);
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

  // ---- Initial check-in photo (wizard step 4) — same compress
  // pipeline, kept separate from profilePhotoDataUrl (a different
  // upload, the progress photo for this first check-in, not the
  // member's profile picture) and from metricsPhotoDataUrl (the
  // existing "Log check-in" dialog's own photo, a completely separate
  // flow further below). ----
  metricPhotoDataUrl = signal<string | null>(null);
  metricPhotoProcessing = signal(false);

  async onMetricPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.toast.error(this.i18n.t('members.invalidPhoto'));
      return;
    }
    this.metricPhotoProcessing.set(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      this.metricPhotoDataUrl.set(dataUrl);
    } catch {
      this.toast.error(this.i18n.t('members.invalidPhoto'));
    } finally {
      this.metricPhotoProcessing.set(false);
      input.value = '';
    }
  }

  clearMetricPhoto(): void {
    this.metricPhotoDataUrl.set(null);
  }

  // Live BMI preview for the wizard's measurements step — mirrors
  // metricsPreviewText() below but reads from `form` instead of
  // metricsForm, and needs a height typed in *this same step* (the
  // existing check-in dialog always has an already-saved member
  // height to read instead).
  wizardBmiPreview = computed(() => {
    const value = this.formValue();
    if (!value?.heightCm || !value?.weightKg) {
      return null;
    }
    const bmi = computeBmi(Number(value.weightKg), Number(value.heightCm));
    return `${this.i18n.t('members.bmiLabel')}: ${bmi} — ${this.i18n.t('members.bmiStatus.' + bmiStatus(bmi))}`;
  });

    form = this.fb.group({
    branchId: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required]],
    email: [''],
    source: [null as string | null],
    planId: ['', [Validators.required]],
    offerId: [null as string | null],
    assignedTrainerEmployeeId: [null as string | null],
    // Personal Training add-on — see onPersonalTrainerToggle() for how
    // checking/unchecking this drives assignedTrainerEmployeeId's own
    // requiredness, and ptDurationExceedsMembership()/stepValid() for
    // the duration-vs-membership validation.
    hasPersonalTrainer: [false],
    ptStartDate: [null as Date | null],
    ptDuration: [null as PtDuration | null],
    ptRatePerMonth: [null as number | null],
    paymentMode: [null as string | null, [Validators.required]],
    isTrial: [false],
    startDate: [new Date(), [Validators.required]],
    status: ['ACTIVE' as MemberStatus],
    dateOfBirth: [null as Date | null],
    gender: [null as Gender | null],
    bloodGroup: [null as string | null],
    heightCm: [null as number | null],
    goalWeightKg: [null as number | null],
    // Partial-payment capture — see paymentType()/setPaymentType()
    // above for how amountPaid/paymentFollowUpDate get cleared when
    // switching back to "Full payment".
    amountPaid: [null as number | null],
    paymentFollowUpDate: [null as Date | null],
    notifyMemberOnPaymentDue: [false],
    notifyGymOnPaymentDue: [false],
    // "Settle balance" checkbox — only meaningful when editing an
    // existing member with an outstanding balance; see
    // settleBalanceControl/showSettleBalance below and
    // MembersService.update's settling branch server-side.
    settleBalance: [false],
    // Initial check-in — all optional (see CreateMemberDto's matching
    // fields server-side).
    weightKg: [null as number | null],
    chestCm: [null as number | null],
    waistCm: [null as number | null],
    hipsCm: [null as number | null],
    armsCm: [null as number | null],
    thighCm: [null as number | null],
    calfCm: [null as number | null],
    shouldersCm: [null as number | null],
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

  // Personal Training — live previews for the Payment step, mirroring
  // MembersService.resolvePersonalTraining server-side (final
  // validation always happens there too; this is just so the error
  // shows up immediately while filling the form instead of only on
  // save).
  ptEndDatePreview = computed<Date | null>(() => {
    const value = this.formValue();
    if (!value?.hasPersonalTrainer || !value.ptStartDate || !value.ptDuration) {
      return null;
    }
    return addMonths(new Date(value.ptStartDate), ptDurationMonths(value.ptDuration));
  });

  ptTotalValue = computed<number | null>(() => {
    const value = this.formValue();
    if (!value?.hasPersonalTrainer || !value.ptDuration || value.ptRatePerMonth === null || value.ptRatePerMonth === undefined) {
      return null;
    }
    return Math.round(Number(value.ptRatePerMonth) * ptDurationMonths(value.ptDuration) * 100) / 100;
  });

  ptTotalPreview = computed(() => {
    const total = this.ptTotalValue();
    if (total === null) {
      return null;
    }
    const symbol = currencySymbol(this.selectedBranch()?.currency);
    return `${symbol}${total.toFixed(2)}`;
  });

  // PT's own end date can't fall after the membership's — membership
  // offers (EXTRA_DURATION etc.) are already baked into endDatePreview
  // above, so this compares against the membership's real, final end
  // date, same as the server does.
  ptDurationExceedsMembership = computed(() => {
    const ptEnd = this.ptEndDatePreview();
    const membershipEnd = this.endDatePreview();
    if (!ptEnd || !membershipEnd) {
      return false;
    }
    return ptEnd.getTime() > membershipEnd.getTime();
  });

  // Checking the box defaults ptStartDate to the membership's own
  // startDate (create) so PT runs in lockstep from day one unless
  // staff overrides it; unchecking clears every PT field entirely —
  // on an edit this is a deliberate cancellation (see
  // MembersService.update's ptTouched handling), not just hiding the
  // section.
  onPersonalTrainerToggle(): void {
    if (this.f.hasPersonalTrainer.value) {
      if (!this.f.ptStartDate.value) {
        const membershipStart = this.f.startDate.value ?? new Date();
        this.form.patchValue({ ptStartDate: this.editingId() ? new Date() : new Date(membershipStart) });
      }
    } else {
      this.form.patchValue({ ptStartDate: null, ptDuration: null, ptRatePerMonth: null });
    }
  }

  // Numeric version of the same computation pricePreview() formats for
  // display — used for the partial-payment validation/balance math,
  // which needs the raw number, not a currency-prefixed string.
  pricePreviewValue = computed<number | null>(() => {
    const plan = this.selectedPlan();
    if (!plan) {
      return null;
    }
    const basePrice = Number(plan.price);
    const offer = this.selectedOffer();
    if (offer?.type === 'PERCENT_DISCOUNT') {
      return Math.max(0, basePrice * (1 - Number(offer.percentValue) / 100));
    }
    if (offer?.type === 'FLAT_DISCOUNT') {
      return Math.max(0, basePrice - Number(offer.flatAmount));
    }
    return basePrice;
  });

  pricePreview = computed(() => {
    const price = this.pricePreviewValue();
    if (price === null) {
      return null;
    }
    const branch = this.selectedBranch();
    const symbol = currencySymbol(branch?.currency);
    return `${symbol}${price.toFixed(2)}`;
  });

  // Combined ceiling used for the partial-payment amountPaid field —
  // membership price plus PT total (0 when PT isn't enabled), same
  // combined total MembersService.create/update validates/clamps
  // against server-side (see totalPayable there).
  totalPayableValue = computed<number | null>(() => {
    const price = this.pricePreviewValue();
    if (price === null) {
      return null;
    }
    return price + (this.formValue()?.hasPersonalTrainer ? this.ptTotalValue() ?? 0 : 0);
  });

  // Balance left to collect — null while the payment type is "Full"
  // (nothing to show) or while amountPaid hasn't been entered yet.
  // Checking "Settle balance" forces this to 0 immediately (optimistic
  // UI — the server does the same thing once the save actually goes
  // through; see MembersService.update's settling branch).
  balanceDue = computed<number | null>(() => {
    if (this.paymentType() !== 'PARTIAL') {
      return null;
    }
    if (this.formValue()?.settleBalance) {
      return 0;
    }
    const price = this.totalPayableValue();
    const paid = this.formValue()?.amountPaid;
    if (price === null || paid === null || paid === undefined) {
      return null;
    }
    return Math.max(0, Math.round((price - paid) * 100) / 100);
  });

  balanceDueLabel = computed(() => {
    const balance = this.balanceDue();
    if (balance === null) {
      return null;
    }
    const symbol = currencySymbol(this.selectedBranch()?.currency);
    return `${symbol}${balance.toFixed(2)}`;
  });

  // "Amount paid now" has no Validators (it's legitimately optional
  // for a Full payment) — its requiredness is purely the custom
  // partial-payment check already in stepValid(), so f.amountPaid.
  // invalid is never true. This mirrors that same check as a signal
  // so the inline .field-error text under the field can react to it.
  amountPaidInvalid = computed(() => {
    if (this.paymentType() !== 'PARTIAL' || this.formValue()?.settleBalance) {
      return false;
    }
    const price = this.totalPayableValue();
    const paid = this.formValue()?.amountPaid;
    return paid === null || paid === undefined || paid < 0 || (price !== null && paid > price);
  });

  // Follow-up-date/notify section only makes sense when there's an
  // actual balance left to collect. Per business rule 2 — "for partial
  // payment if enter full amount that is also full payment only" —
  // entering the full price under the Partial toggle (balanceDue hits
  // 0) hides this section exactly like choosing "Full payment" would,
  // same as checking "Settle balance".
  showFollowUpSection = computed(() => {
    if (this.paymentType() !== 'PARTIAL' || this.formValue()?.settleBalance) {
      return false;
    }
    return (this.balanceDue() ?? 0) > 0;
  });

  // Only offered when editing an existing member who still owes money
  // — never on create (there's nothing to settle yet).
  showSettleBalance = computed(() => {
    const editingId = this.editingId();
    if (!editingId || this.paymentType() !== 'PARTIAL') {
      return false;
    }
    const member = this.editingMember();
    if (!member || member.amountPaid === null) {
      return false;
    }
    const balance = Number(member.price) - Number(member.amountPaid);
    return balance > 0.004;
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
    this.pageHeader.setTitleKey('common.members');
    this.destroyRef.onDestroy(() => this.pageHeader.clear());
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

    // Business rule: once a follow-up date is picked for a partial
    // balance, the gym notification checkbox auto-checks itself (per
    // explicit requirement — "once select reminder date automatically
    // select gym notification for reminder purpose"). Fires every time
    // the date changes to a non-null value, not just the first time;
    // staff can still manually uncheck it afterwards. Clearing the date
    // back to null leaves the checkbox as-is (no auto-uncheck).
    this.f.paymentFollowUpDate.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((date) => {
      if (date) {
        this.f.notifyGymOnPaymentDue.setValue(true);
      }
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
        branchIds: this.branchFilter(),
        statuses: this.statusFilter(),
        hasPersonalTrainer: this.ptFilter().includes('true') ? true : undefined,
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
    this.editingMember.set(null);
    this.partnerMode.set('new');
    this.wizardStep.set(0);
    this.paymentType.set('FULL');
    this.form.reset({
      branchId: this.branches().length === 1 ? this.branches()[0].id : '',
      name: '',
      phone: '',
      email: '',
      source: null,
      planId: '',
      offerId: null,
      assignedTrainerEmployeeId: null,
      hasPersonalTrainer: false,
      ptStartDate: null,
      ptDuration: null,
      ptRatePerMonth: null,
      paymentMode: null,
      isTrial: false,
      startDate: new Date(),
      status: 'ACTIVE',
      dateOfBirth: null,
      gender: null,
      bloodGroup: null,
      heightCm: null,
      goalWeightKg: null,
      amountPaid: null,
      paymentFollowUpDate: null,
      notifyMemberOnPaymentDue: false,
      notifyGymOnPaymentDue: false,
      settleBalance: false,
      weightKg: null,
      chestCm: null,
      waistCm: null,
      hipsCm: null,
      armsCm: null,
      thighCm: null,
      calfCm: null,
      shouldersCm: null,
    });
    this.metricPhotoDataUrl.set(null);
    this.partnerForm.reset({ name: '', phone: '', email: '' });
    this.partnerMemberIdControl.reset(null);
    this.profilePhotoDataUrl.set(null);
    this.profilePhotoCleared.set(false);
    this.dialogVisible.set(true);
  }

  openEdit(member: Member): void {
    this.errorMessage.set(null);
    this.editingId.set(member.id);
    this.editingMember.set(member);
    this.partnerMode.set('new');
    this.wizardStep.set(0);
    const totalPayable = Number(member.price) + (member.hasPersonalTrainer ? Number(member.ptTotal ?? 0) : 0);
    const balance = member.amountPaid !== null ? totalPayable - Number(member.amountPaid) : 0;
    this.paymentType.set(balance > 0.004 ? 'PARTIAL' : 'FULL');
    this.form.reset({
      branchId: member.branchId,
      name: member.name,
      phone: member.phone,
      email: member.email ?? '',
      source: member.source,
      planId: member.planId ?? '',
      offerId: member.offerId,
      assignedTrainerEmployeeId: member.assignedTrainerEmployeeId,
      hasPersonalTrainer: member.hasPersonalTrainer,
      ptStartDate: member.ptStartDate ? new Date(member.ptStartDate) : null,
      ptDuration: member.ptDuration,
      ptRatePerMonth: member.ptRatePerMonth !== null ? Number(member.ptRatePerMonth) : null,
      paymentMode: member.paymentMode,
      isTrial: member.isTrial,
      startDate: new Date(member.startDate),
      status: member.status,
      dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth) : null,
      gender: member.gender,
      bloodGroup: member.bloodGroup,
      heightCm: member.heightCm !== null ? Number(member.heightCm) : null,
      goalWeightKg: member.goalWeightKg !== null ? Number(member.goalWeightKg) : null,
      amountPaid: member.amountPaid !== null ? Number(member.amountPaid) : null,
      paymentFollowUpDate: member.paymentFollowUpDate ? new Date(member.paymentFollowUpDate) : null,
      notifyMemberOnPaymentDue: member.notifyMemberOnPaymentDue,
      notifyGymOnPaymentDue: member.notifyGymOnPaymentDue,
      settleBalance: false,
      // Measurements aren't re-editable from here — editing a member
      // doesn't re-create a check-in (use "Log check-in" for that), so
      // these stay blank; the measurements step for an existing member
      // is effectively a no-op unless they fill it in deliberately.
      weightKg: null,
      chestCm: null,
      waistCm: null,
      hipsCm: null,
      armsCm: null,
      thighCm: null,
      calfCm: null,
      shouldersCm: null,
    });
    this.metricPhotoDataUrl.set(null);
    this.profilePhotoDataUrl.set(member.photoUrl ?? null);
    this.profilePhotoCleared.set(false);
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
  }

  /** Which wizard step a given invalid control lives on — used to jump
   * the person straight back to the first invalid step on save(),
   * since (with free step-jumping now allowed in edit mode, see
   * goToStep) an invalid field could otherwise be left behind on a
   * step they've already navigated away from. */
  private stepForControl(name: string): number {
    if (['name', 'phone'].includes(name)) return 0;
    if (['branchId', 'planId', 'startDate', 'assignedTrainerEmployeeId'].includes(name)) return 1;
    if (['paymentMode', 'ptStartDate', 'ptDuration', 'ptRatePerMonth'].includes(name)) return 2;
    return 0;
  }

  save(): void {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const firstInvalidName = Object.keys(this.f).find((name) => this.form.get(name)?.invalid);
      this.wizardStep.set(firstInvalidName ? this.stepForControl(firstInvalidName) : 0);
      this.errorMessage.set(this.i18n.t('members.requiredFieldsError'));
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
      // Explicit, always-sent boolean (not omitted when false) — on an
      // edit, sending hasPersonalTrainer: false is what tells the
      // server to clear a previously-saved PT state (see
      // MembersService.update's ptTouched handling); omitting it
      // instead would leave stale PT data on the member.
      hasPersonalTrainer: raw.hasPersonalTrainer ?? false,
      ...(raw.hasPersonalTrainer
        ? {
            ptDuration: raw.ptDuration ?? undefined,
            ptRatePerMonth: raw.ptRatePerMonth ?? undefined,
            ptStartDate: raw.ptStartDate ? (raw.ptStartDate as unknown as Date).toISOString() : undefined,
          }
        : {}),
      paymentMode: raw.paymentMode ?? undefined,
      isTrial: raw.isTrial ?? false,
      startDate: (raw.startDate as unknown as Date).toISOString(),
      status: raw.status ?? 'ACTIVE',
      dateOfBirth: raw.dateOfBirth ? (raw.dateOfBirth as unknown as Date).toISOString() : undefined,
      gender: raw.gender ?? undefined,
      bloodGroup: raw.bloodGroup ?? undefined,
      heightCm: raw.heightCm ?? undefined,
      goalWeightKg: raw.goalWeightKg ?? undefined,
      // Partial-payment capture — "Full" always sends amountPaid
      // undefined (the server defaults it to the full computed price),
      // so there's never a stale value left over from a previous
      // "Partial" selection in the same dialog session.
      amountPaid: this.paymentType() === 'PARTIAL' ? raw.amountPaid ?? undefined : undefined,
      paymentFollowUpDate:
        this.paymentType() === 'PARTIAL' && raw.paymentFollowUpDate
          ? (raw.paymentFollowUpDate as unknown as Date).toISOString()
          : undefined,
      notifyMemberOnPaymentDue: raw.notifyMemberOnPaymentDue ?? false,
      notifyGymOnPaymentDue: raw.notifyGymOnPaymentDue ?? false,
      // Only meaningful on an edit of a member with an outstanding
      // balance — see showSettleBalance(); the server ignores this on
      // create entirely (UpdateMemberDto-only field).
      ...(editingId && raw.settleBalance ? { settleBalance: true } : {}),
      // Initial check-in — only sent when a weight was actually
      // entered; omitting it entirely (rather than sending zeros)
      // means the server simply skips creating a MemberMetricEntry.
      ...(raw.weightKg
        ? {
            weightKg: raw.weightKg,
            chestCm: raw.chestCm ?? undefined,
            waistCm: raw.waistCm ?? undefined,
            hipsCm: raw.hipsCm ?? undefined,
            armsCm: raw.armsCm ?? undefined,
            thighCm: raw.thighCm ?? undefined,
            calfCm: raw.calfCm ?? undefined,
            shouldersCm: raw.shouldersCm ?? undefined,
            metricPhotoDataUrl: this.metricPhotoDataUrl() ?? undefined,
          }
        : {}),
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

  // Shown in the row actions whenever a payment could exist to invoice
  // — every non-trial member gets a MemberPayment row at creation (see
  // MembersService.create), so isTrial is the only reliable client-side
  // signal; a member with genuinely no payment yet (shouldn't happen
  // for a non-trial member) just gets a 400 toast from downloadInvoice.
  canDownloadInvoice(member: Member): boolean {
    return !member.isTrial;
  }

  downloadInvoice(member: Member): void {
    this.memberApi.downloadInvoicePdf(member.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Invoice-${member.name.replace(/[^a-zA-Z0-9]+/g, '-')}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        const message = err?.error?.message ?? this.i18n.t('members.saveError');
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
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
    armsCm: [null as number | null],
    thighCm: [null as number | null],
    calfCm: [null as number | null],
    shouldersCm: [null as number | null],
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
      armsCm: latest?.armsCm ? Number(latest.armsCm) : null,
      thighCm: latest?.thighCm ? Number(latest.thighCm) : null,
      calfCm: latest?.calfCm ? Number(latest.calfCm) : null,
      shouldersCm: latest?.shouldersCm ? Number(latest.shouldersCm) : null,
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
      armsCm: raw.armsCm ?? undefined,
      thighCm: raw.thighCm ?? undefined,
      calfCm: raw.calfCm ?? undefined,
      shouldersCm: raw.shouldersCm ?? undefined,
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
