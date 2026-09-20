import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { PageHeaderService } from '../../../shared/page-header/page-header.service';
import { BranchStore } from '../../../core/branches/branch-store.service';
import { PayrollApiService, Payslip } from '../../../core/payroll/payroll-api.service';
import { ToastService } from '../../../core/toast/toast.service';
import { downloadBlob } from '../../../core/common/csv-browser.util';

/**
 * Owner-only payroll run: pick a month (+ optional branch), click
 * Generate, and every active employee in scope gets a payslip computed
 * from their salary structure + that month's attendance-derived LOP —
 * see PayrollService.generateForMonth. Re-running the same month
 * overwrites the previous result rather than duplicating it.
 */
@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, TagModule, MessageModule, TooltipModule, TranslatePipe],
  templateUrl: './payroll.html',
  styleUrls: ['./payroll.css'],
})
export class Payroll implements OnInit {
  private payrollApi = inject(PayrollApiService);
  private toast = inject(ToastService);
  private branchStore = inject(BranchStore);
  private i18n = inject(TranslationService);
  private pageHeader = inject(PageHeaderService);
  private destroyRef = inject(DestroyRef);

  today = new Date();
  selectedYear = signal(this.today.getFullYear());
  selectedMonth = signal(this.today.getMonth() + 1);
  selectedBranchId = signal<string | null>(null);

  branches = this.branchStore.branches;
  branchOptions = computed(() => [
    { label: this.i18n.t('dashboard.allBranches'), value: null },
    ...this.branches().map((b) => ({ label: b.location, value: b.id })),
  ]);

  monthOptions = computed(() => {
    const locale = this.i18n.lang() === 'ta' ? 'ta-IN' : 'en-US';
    const formatter = new Intl.DateTimeFormat(locale, { month: 'long' });
    return Array.from({ length: 12 }, (_, i) => ({ label: formatter.format(new Date(2000, i, 1)), value: i + 1 }));
  });
  yearOptions = computed(() => {
    const current = this.today.getFullYear();
    return Array.from({ length: 5 }, (_, i) => current - i).map((y) => ({ label: String(y), value: y }));
  });

  generating = signal(false);
  generateError = signal<string | null>(null);
  generateSummary = signal<{ generated: number; text: string } | null>(null);

  loading = signal(false);
  payslips = signal<Payslip[]>([]);

  ngOnInit(): void {
    this.pageHeader.setTitleKey('payroll.title');
    this.destroyRef.onDestroy(() => this.pageHeader.clear());
    this.branchStore.ensureLoaded();
    this.loadPayslips();
  }

  onPeriodChange(): void {
    this.loadPayslips();
  }

  loadPayslips(): void {
    this.loading.set(true);
    this.payrollApi.list(this.selectedYear(), this.selectedMonth(), this.selectedBranchId() ?? undefined).subscribe({
      next: (rows) => {
        this.loading.set(false);
        this.payslips.set(rows);
      },
      error: () => this.loading.set(false),
    });
  }

  generate(): void {
    this.generating.set(true);
    this.generateError.set(null);
    this.generateSummary.set(null);
    this.payrollApi
      .generate({
        year: this.selectedYear(),
        month: this.selectedMonth(),
        branchId: this.selectedBranchId() ?? undefined,
      })
      .subscribe({
        next: (result) => {
          this.generating.set(false);
          this.generateSummary.set({
            generated: result.generated,
            text: `${this.i18n.t('payroll.generatedSuccessPrefix')} ${result.generated}`,
          });
          this.loadPayslips();
        },
        error: (err) => {
          this.generating.set(false);
          const message = err?.error?.message ?? this.i18n.t('payroll.generateError');
          this.generateError.set(Array.isArray(message) ? message.join(' ') : message);
        },
      });
  }

  trackPayslip(_index: number, payslip: Payslip): string {
    return payslip.id;
  }

  downloadingPayslipId = signal<string | null>(null);

  downloadPayslip(payslip: Payslip): void {
    this.downloadingPayslipId.set(payslip.id);
    this.payrollApi.pdf(payslip.id).subscribe({
      next: (blob) => {
        this.downloadingPayslipId.set(null);
        downloadBlob(blob, `Payslip-${(payslip.employee?.name ?? 'employee').replace(/\s+/g, '-')}-${payslip.year}-${String(payslip.month).padStart(2, '0')}.pdf`);
      },
      error: () => {
        this.downloadingPayslipId.set(null);
        this.toast.error(this.i18n.t('payroll.pdfDownloadError'));
      },
    });
  }
}
