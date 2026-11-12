import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
import { TableScrollShadowDirective } from '../../../shared/table-scroll-shadow/table-scroll-shadow.directive';
import { InputIconModule } from 'primeng/inputicon';

import {
  AdminPortalApiService,
  PlatformExpense,
  PlatformExpenseCategory,
  PlatformExpenseFrequency,
} from '../../../core/admin-portal/admin-portal-api.service';
import { ThemeToggle } from '../../../shared/theme-toggle/theme-toggle';
import { ConfirmService } from '../../../core/confirm/confirm.service';

const CATEGORY_OPTIONS: { label: string; value: PlatformExpenseCategory }[] = [
  { label: 'Hosting (Vercel/Netlify)', value: 'HOSTING' },
  { label: 'Server (Render/Railway)', value: 'SERVER' },
  { label: 'Database (Supabase/Postgres)', value: 'DATABASE' },
  { label: 'Marketing & ads', value: 'MARKETING' },
  { label: 'Development', value: 'DEVELOPMENT' },
  { label: 'WhatsApp integration', value: 'WHATSAPP' },
  { label: 'Payment gateway fees', value: 'PAYMENT_GATEWAY' },
  { label: 'Other', value: 'OTHER' },
];

const FREQUENCY_OPTIONS: { label: string; value: PlatformExpenseFrequency }[] = [
  { label: 'One-time', value: 'ONE_TIME' },
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Annual', value: 'ANNUAL' },
];

@Component({
  selector: 'app-admin-portal-expenses',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    DialogModule,
    SelectModule,
    InputNumberModule,
    DatePickerModule,
    InputTextModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
    FormsModule,
    ThemeToggle,
    TableScrollShadowDirective,
  ],
  templateUrl: './admin-portal-expenses.html',
  styleUrls: ['./admin-portal-expenses.css'],
})
export class AdminPortalExpenses implements OnInit {
  private api = inject(AdminPortalApiService);
  private fb = inject(FormBuilder);
  private confirm = inject(ConfirmService);
  private router = inject(Router);

  categoryOptions = CATEGORY_OPTIONS;
  frequencyOptions = FREQUENCY_OPTIONS;

  loading = signal(true);
  errorMessage = signal<string | null>(null);
  expenses = signal<PlatformExpense[]>([]);
  searchTerm = signal('');
  categoryFilter = signal<PlatformExpenseCategory | 'ALL'>('ALL');
  frequencyFilter = signal<PlatformExpenseFrequency | 'ALL'>('ALL');
  dateFrom = signal<Date | null>(null);
  dateTo = signal<Date | null>(null);

  categoryFilterOptions = [{ label: 'All categories', value: 'ALL' as const }, ...CATEGORY_OPTIONS];
  frequencyFilterOptions = [{ label: 'All frequencies', value: 'ALL' as const }, ...FREQUENCY_OPTIONS];

  // Inclusive day-level range — `to` is end-of-day so picking the same
  // day for from/to still matches an expense incurred any time that day.
  private inDateRange(value: string | Date, from: Date | null, to: Date | null): boolean {
    const d = new Date(value).getTime();
    if (from && d < new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()) return false;
    if (to && d > new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime()) return false;
    return true;
  }

  filteredExpenses = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const category = this.categoryFilter();
    const frequency = this.frequencyFilter();
    const from = this.dateFrom();
    const to = this.dateTo();
    return this.expenses().filter((e) => {
      if (
        term &&
        !(
          e.label.toLowerCase().includes(term) ||
          this.categoryLabel(e.category).toLowerCase().includes(term) ||
          (e.notes ?? '').toLowerCase().includes(term)
        )
      ) {
        return false;
      }
      if (category !== 'ALL' && e.category !== category) return false;
      if (frequency !== 'ALL' && e.frequency !== frequency) return false;
      if (!this.inDateRange(e.incurredAt, from, to)) return false;
      return true;
    });
  });

  clearFilters(): void {
    this.searchTerm.set('');
    this.categoryFilter.set('ALL');
    this.frequencyFilter.set('ALL');
    this.dateFrom.set(null);
    this.dateTo.set(null);
  }

  dialogVisible = signal(false);
  editingId = signal<string | null>(null);
  saving = signal(false);
  formError = signal<string | null>(null);

  // Quick running totals shown above the table — same monthly-
  // equivalent treatment as the backend's overview() (ANNUAL / 12),
  // so what's displayed here always matches the dashboard's numbers.
  monthlyRecurringTotal = computed(() =>
    this.expenses().reduce((sum, e) => {
      const amount = Number(e.amountInr);
      if (e.frequency === 'MONTHLY') return sum + amount;
      if (e.frequency === 'ANNUAL') return sum + amount / 12;
      return sum;
    }, 0),
  );

  oneTimeTotal = computed(() =>
    this.expenses()
      .filter((e) => e.frequency === 'ONE_TIME')
      .reduce((sum, e) => sum + Number(e.amountInr), 0),
  );

  form = this.fb.group({
    category: ['HOSTING' as PlatformExpenseCategory, [Validators.required]],
    label: ['', [Validators.required, Validators.minLength(2)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    frequency: ['MONTHLY' as PlatformExpenseFrequency, [Validators.required]],
    incurredAt: [new Date(), [Validators.required]],
    notes: [''],
  });

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.api.listExpenses().subscribe({
      next: (data) => {
        this.loading.set(false);
        this.expenses.set(data);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Failed to load expenses.');
      },
    });
  }

  openAdd(): void {
    this.editingId.set(null);
    this.formError.set(null);
    this.form.reset({
      category: 'HOSTING',
      label: '',
      amount: 0,
      frequency: 'MONTHLY',
      incurredAt: new Date(),
      notes: '',
    });
    this.dialogVisible.set(true);
  }

  openEdit(expense: PlatformExpense): void {
    this.editingId.set(expense.id);
    this.formError.set(null);
    this.form.reset({
      category: expense.category,
      label: expense.label,
      amount: Number(expense.amountInr),
      frequency: expense.frequency,
      incurredAt: new Date(expense.incurredAt),
      notes: expense.notes ?? '',
    });
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
  }

  save(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const input = {
      category: raw.category!,
      label: raw.label!,
      amountInr: raw.amount!,
      frequency: raw.frequency!,
      incurredAt: raw.incurredAt!.toISOString(),
      notes: raw.notes || undefined,
    };

    const id = this.editingId();
    const request = id ? this.api.updateExpense(id, input) : this.api.createExpense(input);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.message ?? 'Failed to save expense.');
      },
    });
  }

  confirmDelete(expense: PlatformExpense): void {
    this.confirm
      .confirm({
        header: 'Delete expense',
        message: `Remove "${expense.label}"? This can't be undone.`,
        acceptLabel: 'Delete',
        severity: 'danger',
      })
      .then((confirmed) => {
        if (!confirmed) return;
        this.api.deleteExpense(expense.id).subscribe({
          next: () => this.load(),
          error: (err) => this.errorMessage.set(err?.error?.message ?? 'Failed to delete expense.'),
        });
      });
  }

  categoryLabel(value: string): string {
    return CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value;
  }
}
