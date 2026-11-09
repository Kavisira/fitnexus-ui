import { Component, inject, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';

import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TokenStorage } from '../../core/auth/token-storage.service';
import { ToastService } from '../../core/toast/toast.service';
import { OrganizationApiService, OrganizationFullProfile } from '../../core/organization/organization-api.service';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  BRANCH_MANAGER: 'Branch Manager',
  TRAINER: 'Trainer',
  FRONT_DESK: 'Front Desk',
};

const TIER_LABELS: Record<string, string> = {
  STARTER: 'Starter',
  PLUS: 'Plus',
  GROWTH: 'Growth',
  PRO: 'Pro',
  SCALE: 'Scale',
  ENTERPRISE: 'Enterprise',
};

/** The "Profile" item in the header's avatar popup menu (see
 * shared/header) opens this — a pure info panel: the logged-in
 * user's own identity at the top, then everything about the
 * organization (OrganizationApiService.mine()), including its
 * subscription snapshot. Settings/Deployed-version/Logout are
 * separate items in that same popup menu, not buttons inside this
 * dialog — this is display-only aside from the one "Go to Billing"
 * shortcut, which is specific to what's shown here. */
@Component({
  selector: 'app-org-info-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TagModule, AvatarModule, TranslatePipe],
  templateUrl: './org-info-dialog.html',
  styleUrls: ['./org-info-dialog.css'],
})
export class OrgInfoDialog {
  private tokenStorage = inject(TokenStorage);
  private toast = inject(ToastService);
  private organizationApi = inject(OrganizationApiService);
  private router = inject(Router);

  visible = model(false);

  org = signal<OrganizationFullProfile | null>(null);
  loading = signal(false);
  private loaded = false;

  get userEmail(): string {
    return this.tokenStorage.getEmail() ?? '';
  }

  get userInitial(): string {
    return (this.userEmail || 'U').charAt(0).toUpperCase();
  }

  get userRoleLabel(): string {
    const role = this.tokenStorage.getRole();
    return role ? (ROLE_LABELS[role] ?? role) : '';
  }

  get isOwner(): boolean {
    return this.tokenStorage.isOwner();
  }

  onShow(): void {
    if (!this.loaded) {
      this.load();
    }
  }

  load(): void {
    this.loading.set(true);
    this.organizationApi.mine().subscribe({
      next: (org) => {
        this.loading.set(false);
        this.loaded = true;
        this.org.set(org);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load organization details.');
      },
    });
  }

  tierLabel(tier: string | null): string {
    return tier ? (TIER_LABELS[tier] ?? tier) : '';
  }

  // Maps the raw backend enum to the orgInfoDialog.subStatus* i18n key
  // — can't just string-concat the enum (it's SCREAMING_CASE, the key
  // suffixes are PascalCase).
  subStatusKey(status: string): string {
    const key: Record<string, string> = {
      TRIALING: 'orgInfoDialog.subStatusTrialing',
      ACTIVE: 'orgInfoDialog.subStatusActive',
      PAST_DUE: 'orgInfoDialog.subStatusPastDue',
      CANCELLED: 'orgInfoDialog.subStatusCancelled',
      EXPIRED: 'orgInfoDialog.subStatusExpired',
    };
    return key[status] ?? status;
  }

  goToBilling(): void {
    this.visible.set(false);
    this.router.navigateByUrl('/billing');
  }
}
