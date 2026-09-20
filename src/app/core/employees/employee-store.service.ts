import { Injectable, computed, inject, signal } from '@angular/core';

import { Employee, EmployeeApiService } from './employee-api.service';

/** Shared client-side cache of the org's employee list — same pattern as
 * BranchStore/NotificationStore: one signal, fetched once and shared by
 * every page that needs it, instead of each page independently calling
 * employeeApi.list() in its own ngOnInit (previously 4 separate call
 * sites, all requesting the exact same unfiltered list). One instance
 * app-wide (providedIn: 'root').
 *
 * Reading: call ensureLoaded() from ngOnInit, then read employees()/
 * activeEmployees() — safe to call ensureLoaded() from many components,
 * only the first one actually hits the API.
 *
 * Writing: this store does NOT wrap create/update/remove — pages keep
 * calling EmployeeApiService directly for mutations (unchanged
 * behavior, error handling, toasts, the create-login/credentials/
 * activity flows). After a mutation that adds/edits/removes an
 * employee succeeds, the page calls reload() so every page sharing this
 * store picks up the change, instead of only the page that made the
 * edit. */
@Injectable({ providedIn: 'root' })
export class EmployeeStore {
  private api = inject(EmployeeApiService);

  private employeesSignal = signal<Employee[]>([]);
  loading = signal(false);
  private loadedOnce = false;

  employees = this.employeesSignal.asReadonly();

  // Leads' assignment dropdown wants ACTIVE-only; Attendance/Members/
  // the Employees management page itself read the raw `employees()`
  // list since they need INACTIVE ones too.
  activeEmployees = computed(() => this.employeesSignal().filter((e) => e.status === 'ACTIVE'));

  /** Call once per component, typically in ngOnInit — fetches the list
   * from the server only the first time it's ever called anywhere in
   * the app; every subsequent call (from any component) just reuses
   * the already-loaded signal. Call reload() instead if you need to
   * force a refetch (i.e. right after a mutation). */
  ensureLoaded(): void {
    if (this.loadedOnce) {
      return;
    }
    this.reload();
  }

  /** Forces a refetch from the server and updates the shared signal —
   * call this after any employee create/update/remove succeeds, so
   * every page reading this store (not just the one that made the
   * change) sees the latest data. `onError` is optional so a caller
   * that wants its own error toast (e.g. the Employees management
   * page) can still show one. */
  reload(onError?: () => void): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (employees) => {
        this.loading.set(false);
        this.loadedOnce = true;
        this.employeesSignal.set(employees);
      },
      error: () => {
        // Deliberately NOT marking loadedOnce here — see BranchStore's
        // identical comment: let the next ensureLoaded() retry instead
        // of permanently giving up for the session.
        this.loading.set(false);
        onError?.();
      },
    });
  }
}
