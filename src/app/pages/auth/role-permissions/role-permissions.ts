import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TooltipModule } from 'primeng/tooltip';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ToastService } from '../../../core/toast/toast.service';
import {
  PermissionScreen,
  RolePermission,
  RolePermissionApiService,
  StaffRole,
} from '../../../core/roles/role-permission-api.service';

// Fixed row/column order — kept here (not just derived from whatever
// the backend returns) so the table always shows a full grid even
// before RolesService.ensureSeeded has run for a given cell.
const ROLES: StaffRole[] = ['BRANCH_MANAGER', 'TRAINER', 'FRONT_DESK'];
// DASHBOARD is deliberately excluded — it's always-on for every role
// (server-enforced in RolesService.can/getForRole) and has no write
// action, so there's nothing here for an owner to configure.
const SCREENS: PermissionScreen[] = ['EMPLOYEES', 'ATTENDANCE', 'LEADS', 'NOTIFICATIONS', 'BRANCHES', 'MEMBERS', 'PLANS', 'EXPENSES'];

interface Cell {
  role: StaffRole;
  screen: PermissionScreen;
  canRead: boolean;
  canWrite: boolean;
}

type Matrix = Record<string, Record<string, Cell>>;

/**
 * Roles & Permissions — an editable role x screen matrix (read/write
 * checkboxes), owner-only. Trainer/Manager/Front Desk all start with
 * full access on every screen (including ones that don't exist yet,
 * like Attendance/Members) — this screen lets that be narrowed later
 * without a code change.
 *
 * Checking/unchecking a box only edits local state — nothing is sent
 * to the server until "Save changes" is clicked, and that button is
 * disabled until at least one cell actually differs from what was last
 * loaded/saved. This avoids firing an API call per click, which used
 * to happen on every single checkbox toggle.
 */
@Component({
  selector: 'app-role-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, TooltipModule],
  templateUrl: './role-permissions.html',
  styleUrls: ['./role-permissions.css'],
})
export class RolePermissions implements OnInit {
  private api = inject(RolePermissionApiService);
  private toast = inject(ToastService);
  private i18n = inject(TranslationService);

  loading = signal(false);
  saving = signal(false);
  roles = ROLES;
  screens = SCREENS;

  // role -> screen -> Cell, built from the flat API list so the
  // template can do a simple two-level lookup per grid cell. `matrix`
  // is the working copy the checkboxes read/write; `savedMatrix` is
  // the last known-persisted state, used both to detect dirtiness and
  // to diff against on Save (so only changed cells are sent) and to
  // restore on Discard.
  matrix = signal<Matrix>({});
  private savedMatrix: Matrix = {};

  // True as soon as any cell differs from savedMatrix — drives the
  // Save/Discard buttons' disabled state.
  isDirty = computed(() => {
    const current = this.matrix();
    for (const role of this.roles) {
      for (const screen of this.screens) {
        const a = current[role]?.[screen];
        const b = this.savedMatrix[role]?.[screen];
        if (!a || !b || a.canRead !== b.canRead || a.canWrite !== b.canWrite) {
          return true;
        }
      }
    }
    return false;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (rows) => {
        this.loading.set(false);
        const built = this.buildMatrix(rows);
        this.matrix.set(built);
        this.savedMatrix = this.cloneMatrix(built);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.i18n.t('rolePermissions.loadError'));
      },
    });
  }

  private buildMatrix(rows: RolePermission[]): Matrix {
    const byKey = new Map(rows.map((r) => [`${r.role}:${r.screen}`, r]));
    const matrix: Matrix = {};
    for (const role of ROLES) {
      matrix[role] = {};
      for (const screen of SCREENS) {
        const row = byKey.get(`${role}:${screen}`);
        matrix[role][screen] = {
          role,
          screen,
          canRead: row?.canRead ?? true,
          canWrite: row?.canWrite ?? true,
        };
      }
    }
    return matrix;
  }

  private cloneMatrix(matrix: Matrix): Matrix {
    const clone: Matrix = {};
    for (const role of Object.keys(matrix)) {
      clone[role] = {};
      for (const screen of Object.keys(matrix[role])) {
        clone[role][screen] = { ...matrix[role][screen] };
      }
    }
    return clone;
  }

  cell(role: StaffRole, screen: PermissionScreen): Cell {
    return this.matrix()[role][screen];
  }

  roleLabel(role: StaffRole): string {
    return this.i18n.t(`rolePermissions.role.${role}`);
  }

  screenLabel(screen: PermissionScreen): string {
    return this.i18n.t(`rolePermissions.screen.${screen}`);
  }

  // ---- Local-only edits — no API call, just updates `matrix` ----

  toggleRead(role: StaffRole, screen: PermissionScreen): void {
    const current = this.cell(role, screen);
    // Turning read off also turns write off — write implies read (same
    // rule the backend enforces in RolesService.updateCell).
    this.setCell(role, screen, !current.canRead, current.canRead ? false : current.canWrite);
  }

  toggleWrite(role: StaffRole, screen: PermissionScreen): void {
    const current = this.cell(role, screen);
    // Turning write on also turns read on.
    this.setCell(role, screen, current.canWrite ? current.canRead : true, !current.canWrite);
  }

  private setCell(role: StaffRole, screen: PermissionScreen, canRead: boolean, canWrite: boolean): void {
    this.matrix.update((m) => ({
      ...m,
      [role]: { ...m[role], [screen]: { role, screen, canRead, canWrite } },
    }));
  }

  // ---- Save / Discard ----

  /** Reverts every unsaved edit back to the last loaded/saved state. */
  discard(): void {
    this.matrix.set(this.cloneMatrix(this.savedMatrix));
  }

  /** Sends only the cells that actually changed since the last load/save,
   * all in parallel, then adopts the result as the new saved baseline. */
  save(): void {
    if (!this.isDirty() || this.saving()) {
      return;
    }

    const current = this.matrix();
    const changed: Cell[] = [];
    for (const role of this.roles) {
      for (const screen of this.screens) {
        const a = current[role][screen];
        const b = this.savedMatrix[role]?.[screen];
        if (!b || a.canRead !== b.canRead || a.canWrite !== b.canWrite) {
          changed.push(a);
        }
      }
    }
    if (!changed.length) {
      return;
    }

    this.saving.set(true);
    const requests = changed.map((c) => this.api.update(c.role, c.screen, c.canRead, c.canWrite));

    forkJoin(requests).subscribe({
      next: (updatedRows) => {
        this.saving.set(false);
        this.matrix.update((m) => {
          const next = this.cloneMatrix(m);
          for (const row of updatedRows) {
            next[row.role][row.screen] = {
              role: row.role,
              screen: row.screen,
              canRead: row.canRead,
              canWrite: row.canWrite,
            };
          }
          return next;
        });
        this.savedMatrix = this.cloneMatrix(this.matrix());
        this.toast.success(this.i18n.t('rolePermissions.savedSuccess'));
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.i18n.t('rolePermissions.saveError'));
        // Re-pull from the server so the grid can't end up straddling a
        // partially-applied batch (some of the parallel requests may
        // have succeeded before one failed).
        this.load();
      },
    });
  }
}
