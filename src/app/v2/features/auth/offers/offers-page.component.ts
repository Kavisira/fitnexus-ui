import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { ConfirmService } from '../../../../core/confirm/confirm.service';
import { Offer, OfferApiService, OfferPayload, OfferType } from '../../../../core/offers/offer-api.service';
import { PermissionsService } from '../../../../core/roles/permissions.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { FilterDropdownComponent } from '../../../shared/components/filter-dropdown/filter-dropdown.component';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';
import { OfferCardGridComponent } from './components/offer-card-grid.component';
import { OfferFormModalComponent } from './components/offer-form-modal.component';
import { OFFER_TYPE_FILTER_OPTIONS } from './services/offer.utils';

@Component({
  selector: 'app-v2-offers-page',
  imports: [
    NzButtonModule, NzIconModule, SearchInputComponent,
    FilterDropdownComponent, OfferCardGridComponent, OfferFormModalComponent,
  ],
  template: `
    <div class="flex flex-col flex-1 min-w-0 space-y-4">
      <!-- Filter & Action Bar -->
      <!-- Single row: only one filter, so it sits beside the search instead of a dedicated row -->
      <div class="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div class="sm:col-span-5 min-w-0">
            <app-search-input placeholder="Search offers by name..." [(value)]="search"></app-search-input>
          </div>
          <div class="sm:col-span-7 flex items-center justify-start sm:justify-end gap-2 flex-wrap min-w-0">
            <app-filter-dropdown
              label="Type" placeholder="All types" searchPlaceholder="Search types..."
              [options]="typeOptions" [selectedValues]="selectedTypes()"
              (selectedValuesChange)="onTypesChange($event)"
            ></app-filter-dropdown>
            @if (hasFilters()) {
              <button nz-button nzType="text" nzDanger (click)="clearFilters()" class="!h-9 !rounded-lg !inline-flex !items-center gap-1.5 text-xs font-semibold shrink-0 hover:!bg-red-50 dark:hover:!bg-red-950/20">
                <span nz-icon nzType="close-circle"></span><span>Reset</span>
              </button>
            }
            @if (canWrite()) {
              <button nz-button nzType="primary" (click)="openCreate()" class="!h-9 !rounded-xl !px-4 !inline-flex !items-center gap-1.5 text-xs font-semibold !bg-blue-600 hover:!bg-blue-500 shadow-xs shrink-0">
                <span nz-icon nzType="plus"></span><span>Add Offer</span>
              </button>
            }
          </div>
        </div>
      </div>

      <app-offer-card-grid
        [offers]="filteredOffers()"
        [loading]="loading()"
        [canWrite]="canWrite()"
        (editOffer)="openEdit($event)"
        (deleteOffer)="remove($event)"
      ></app-offer-card-grid>

      <div class="text-xs text-gray-500 px-1">
        Showing <strong class="text-gray-900 dark:text-white">{{ filteredOffers().length }}</strong> of {{ offers().length }} offers
      </div>

      @if (modalVisible()) {
        <app-offer-form-modal
          [offer]="editingOffer()"
          [saving]="saving()"
          [serverError]="serverError()"
          (cancel)="modalVisible.set(false)"
          (save)="onSave($event)"
        ></app-offer-form-modal>
      }
    </div>
  `,
  host: { class: 'flex flex-col flex-1 min-h-0 min-w-0 w-full max-w-full' },
})
export class V2OffersPageComponent implements OnInit {
  private offerApi = inject(OfferApiService);
  private permissions = inject(PermissionsService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  // Offers share the PLANS permission server-side.
  readonly canWrite = computed(() => this.permissions.canWrite('PLANS'));
  readonly typeOptions = OFFER_TYPE_FILTER_OPTIONS;

  readonly offers = signal<Offer[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly modalVisible = signal(false);
  readonly editingOffer = signal<Offer | null>(null);

  readonly search = signal('');
  readonly selectedTypes = signal<OfferType[]>([]);

  readonly hasFilters = computed(() => !!this.search().trim() || this.selectedTypes().length > 0);

  readonly filteredOffers = computed(() => {
    const term = this.search().trim().toLowerCase();
    const types = this.selectedTypes();
    return this.offers().filter(
      (o) => (types.length === 0 || types.includes(o.type)) && (!term || o.name.toLowerCase().includes(term)),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.offerApi.list().subscribe({
      next: (rows) => { this.loading.set(false); this.offers.set(rows); },
      error: () => { this.loading.set(false); this.toast.error('Could not load offers.'); },
    });
  }

  onTypesChange(values: string[]): void {
    this.selectedTypes.set(values as OfferType[]);
  }

  clearFilters(): void {
    this.search.set('');
    this.selectedTypes.set([]);
  }

  openCreate(): void {
    this.editingOffer.set(null);
    this.serverError.set(null);
    this.modalVisible.set(true);
  }

  openEdit(offer: Offer): void {
    this.editingOffer.set(offer);
    this.serverError.set(null);
    this.modalVisible.set(true);
  }

  onSave(payload: OfferPayload): void {
    const id = this.editingOffer()?.id;
    this.saving.set(true);
    this.serverError.set(null);
    const req = id ? this.offerApi.update(id, payload) : this.offerApi.create(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalVisible.set(false);
        this.toast.success(id ? 'Offer updated.' : 'Offer created.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Could not save offer.';
        this.serverError.set(Array.isArray(msg) ? msg.join(' ') : msg);
      },
    });
  }

  async remove(offer: Offer): Promise<void> {
    const ok = await this.confirm.confirm({
      header: 'Delete Offer',
      message: `Delete "${offer.name}"? This cannot be undone.`,
      acceptLabel: 'Delete',
      severity: 'danger',
    });
    if (!ok) return;
    this.offerApi.remove(offer.id).subscribe({
      next: () => { this.toast.success('Offer deleted.'); this.load(); },
      error: (err) => this.toast.error(err?.error?.message ?? 'Could not delete offer.'),
    });
  }
}
