import { Component, computed, inject } from '@angular/core';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-header',
  template: `
    <header class="border-b border-rule">
      <div class="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
        <p class="font-display text-xl font-semibold tracking-tight text-ink">CV Reader</p>
        @if (account(); as acc) {
          <div class="flex min-w-0 items-center gap-3 text-sm">
            <span class="truncate text-muted">{{ acc.name || acc.username }}</span>
            <button
              type="button"
              class="shrink-0 rounded-md border border-rule bg-sheet px-3 py-1.5 text-ink transition-colors hover:bg-accent-soft"
              (click)="signOut()"
            >
              Sign out
            </button>
          </div>
        }
      </div>
    </header>
  `,
})
export class HeaderComponent {
  private readonly msal = inject(MsalService);

  protected readonly account = computed(
    () => this.msal.instance.getActiveAccount() ?? this.msal.instance.getAllAccounts()[0] ?? null,
  );

  protected signOut(): void {
    void this.msal.logoutRedirect();
  }
}
