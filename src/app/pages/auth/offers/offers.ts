import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ToastService } from '../../../core/toast/toast.service';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { Offer, OfferApiService, OfferPayload, OfferType } from '../../../core/offers/offer-api.service';
import { PermissionsService } from '../../../core/roles/permissions.service';

/**
 * Offers — an independent, org-wide discount/promo catalog. Not tied to
 * any branch or plan: a "10% off" or "1 month free" offer configured
 * here can be applied against any plan at any branch. Definitions only
 * for now — actually applying one to a member signup (adjusting their
 * price, duration, or flagging a second free/discounted member) happens
 * once the Members module exists; that screen will read this same list.
 */
@Component({
  selector: 'app-offers',
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
    MessageModule,
    TooltipModule,
    CardModule,
    TagModule,
    CheckboxModule,
    TranslatePipe,
  ],
  templateUrl: './offers.html',
  styleUrls: ['./offers.css'],
})
export class Offers implements OnInit {
  private fb = inject(FormBuilder);
  private offerApi = inject(OfferApiService);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private i18n = inject(TranslationService);
  private permissions = inject(PermissionsService);

  // Offers are part of Plans management server-side (same PLANS
  // permission), so write-gating here mirrors the Plans screen exactly.
  canWrite = computed(() => this.permissions.canWrite('PLANS'));

  offers = signal<Offer[]>([]);
  loading = signal(false);
  saving = signal(false);

  searchTerm = signal('');
  typeFilter = signal<OfferType | null>(null);

  dialogVisible = signal(false);
  editingId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  offerTypeOptions: { label: string; value: OfferType }[] = [
    { label: 'Percentage discount', value: 'PERCENT_DISCOUNT' },
    { label: 'Flat amount discount', value: 'FLAT_DISCOUNT' },
    { label: 'Extra free duration', value: 'EXTRA_DURATION' },
    { label: 'Couple offer (2nd member)', value: 'COUPLE' },
  ];

  typeFilterOptions = computed(() => [
    { label: this.i18n.t('offersPage.allTypes'), value: null },
    ...this.offerTypeOptions,
  ]);

  hasActiveFilters = computed(() => !!this.searchTerm().trim() || !!this.typeFilter());

  clearFilters(): void {
    this.searchTerm.set('');
    this.typeFilter.set(null);
  }

  filteredOffers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const type = this.typeFilter();

    let offers = this.offers();
    if (type) {
      offers = offers.filter((o) => o.type === type);
    }
    if (!term) {
      return offers;
    }
    return offers.filter((o) => o.name.toLowerCase().includes(term));
  });

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    type: ['PERCENT_DISCOUNT' as OfferType, [Validators.required]],
    percentValue: [null as number | null],
    flatAmount: [null as number | null],
    extraMonths: [null as number | null],
    isActive: [true],
  });

  get f() {
    return this.form.controls;
  }

  private formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  formType = computed(() => this.formValue()?.type ?? 'PERCENT_DISCOUNT');

  ngOnInit(): void {
    this.loadOffers();
  }

  loadOffers(): void {
    this.loading.set(true);
    this.offerApi.list().subscribe({
      next: (offers) => {
        this.loading.set(false);
        this.offers.set(offers);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.i18n.t('offersPage.loadError'));
      },
    });
  }

  openCreate(): void {
    this.errorMessage.set(null);
    this.editingId.set(null);
    this.form.reset({
      name: '',
      type: 'PERCENT_DISCOUNT',
      percentValue: null,
      flatAmount: null,
      extraMonths: null,
      isActive: true,
    });
    this.dialogVisible.set(true);
  }

  openEdit(offer: Offer): void {
    this.errorMessage.set(null);
    this.editingId.set(offer.id);
    this.form.reset({
      name: offer.name,
      type: offer.type,
      percentValue: offer.percentValue !== null ? Number(offer.percentValue) : null,
      flatAmount: offer.flatAmount !== null ? Number(offer.flatAmount) : null,
      extraMonths: offer.extraMonths,
      isActive: offer.isActive,
    });
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
  }

  save(): void {
    this.errorMessage.set(null);
    const raw = this.form.getRawValue();
    if (!raw.name || raw.name.trim().length < 2) {
      this.form.markAllAsTouched();
      return;
    }
    if ((raw.type === 'PERCENT_DISCOUNT' || raw.type === 'COUPLE') && !raw.percentValue) {
      this.errorMessage.set(this.i18n.t('offersPage.percentRequired'));
      return;
    }
    if (raw.type === 'FLAT_DISCOUNT' && !raw.flatAmount) {
      this.errorMessage.set(this.i18n.t('offersPage.flatAmountRequired'));
      return;
    }
    if (raw.type === 'EXTRA_DURATION' && !raw.extraMonths) {
      this.errorMessage.set(this.i18n.t('offersPage.extraMonthsRequired'));
      return;
    }

    this.saving.set(true);
    const payload: OfferPayload = {
      name: raw.name!,
      type: raw.type!,
      isActive: raw.isActive ?? true,
      ...(raw.type === 'PERCENT_DISCOUNT' || raw.type === 'COUPLE' ? { percentValue: raw.percentValue! } : {}),
      ...(raw.type === 'FLAT_DISCOUNT' ? { flatAmount: raw.flatAmount! } : {}),
      ...(raw.type === 'EXTRA_DURATION' ? { extraMonths: raw.extraMonths! } : {}),
    };

    const editingId = this.editingId();
    const request = editingId ? this.offerApi.update(editingId, payload) : this.offerApi.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.toast.success(this.i18n.t(editingId ? 'offersPage.updatedSuccess' : 'offersPage.createdSuccess'));
        this.loadOffers();
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message ?? this.i18n.t('offersPage.saveError');
        this.errorMessage.set(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  async remove(offer: Offer): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      message: this.i18n.t('offersPage.deleteConfirm'),
      header: this.i18n.t('offersPage.deleteConfirmHeader'),
      acceptLabel: this.i18n.t('common.delete'),
      severity: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.offerApi.remove(offer.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('offersPage.deletedSuccess'));
        this.loadOffers();
      },
      error: (err) => {
        const message = err?.error?.message ?? this.i18n.t('offersPage.saveError');
        this.toast.error(Array.isArray(message) ? message.join(' ') : message);
      },
    });
  }

  typeLabel(type: OfferType): string {
    return this.offerTypeOptions.find((o) => o.value === type)?.label ?? type;
  }

  /** Human-readable one-liner, e.g. "10% off", "500 off", "+1 month
   * free", "2nd member 100% off". A FLAT_DISCOUNT amount is shown as a
   * plain number — it has no currency of its own (see the doc comment
   * on the Offer model); the currency it's actually charged in follows
   * whichever branch/plan it gets applied against later. */
  offerSummary(offer: Offer): string {
    switch (offer.type) {
      case 'PERCENT_DISCOUNT':
        return `${Number(offer.percentValue)}% ${this.i18n.t('offersPage.offSuffix')}`;
      case 'FLAT_DISCOUNT':
        return `${Number(offer.flatAmount).toFixed(2)} ${this.i18n.t('offersPage.offSuffix')}`;
      case 'EXTRA_DURATION':
        return `+${offer.extraMonths} ${this.i18n.t('offersPage.extraMonthsSuffix')}`;
      case 'COUPLE': {
        const percent = Number(offer.percentValue);
        return percent >= 100
          ? this.i18n.t('offersPage.coupleFreeSuffix')
          : `${this.i18n.t('offersPage.couplePrefix')} ${percent}% ${this.i18n.t('offersPage.offSuffix')}`;
      }
      default:
        return offer.name;
    }
  }
}
