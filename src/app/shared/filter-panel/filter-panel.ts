import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule } from 'primeng/popover';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';

export interface FilterOption {
  label: string;
  value: unknown;
}

export interface FilterSection {
  /** Key this section's selected values are stored under, e.g. "branchId". */
  key: string;
  label: string;
  options: FilterOption[];
  placeholder?: string;
}

/** One "Filter" icon button that expands into a popover panel holding a
 * multi-select per filter dimension (branch, status, role, ...), plus
 * Apply/Clear buttons at the bottom — used in place of several separate
 * dropdowns sitting directly in a page's toolbar. Nothing takes effect
 * until "Apply" is clicked; "Clear" resets every section and applies
 * immediately. The parent owns the actual applied filter values (passed
 * in via `value`) and reacts to `(apply)`/`(clear)`. */
@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [FormsModule, ButtonModule, PopoverModule, MultiSelectModule, TooltipModule],
  templateUrl: './filter-panel.html',
  styleUrls: ['./filter-panel.css'],
})
export class FilterPanel implements OnChanges {
  @Input() sections: FilterSection[] = [];
  /** Currently applied values, keyed by section key. */
  @Input() value: Record<string, unknown[]> = {};
  @Input() label = 'Filters';

  @Output() apply = new EventEmitter<Record<string, unknown[]>>();
  @Output() clear = new EventEmitter<void>();

  @ViewChild('panel') panel?: Popover;

  /** Working copy edited inside the panel; only pushed out on Apply. */
  staged: Record<string, unknown[]> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.staged = this.cloneValue(this.value);
    }
  }

  private cloneValue(value: Record<string, unknown[]>): Record<string, unknown[]> {
    const copy: Record<string, unknown[]> = {};
    for (const key of Object.keys(value ?? {})) {
      copy[key] = [...(value[key] ?? [])];
    }
    return copy;
  }

  stagedFor(key: string): unknown[] {
    return this.staged[key] ?? [];
  }

  setStagedFor(key: string, values: unknown[]): void {
    this.staged = { ...this.staged, [key]: values };
  }

  toggle(event: Event): void {
    // Re-seed the working copy from the currently applied values every
    // time the panel opens, so a dismiss-without-apply discards edits.
    this.staged = this.cloneValue(this.value);
    this.panel?.toggle(event);
  }

  activeCount(): number {
    return Object.values(this.value ?? {}).reduce((count, values) => count + (values?.length ?? 0), 0);
  }

  onApply(): void {
    this.apply.emit(this.cloneValue(this.staged));
    this.panel?.hide();
  }

  onClear(): void {
    const cleared: Record<string, unknown[]> = {};
    for (const section of this.sections) {
      cleared[section.key] = [];
    }
    this.staged = cleared;
    this.clear.emit();
    this.panel?.hide();
  }
}
