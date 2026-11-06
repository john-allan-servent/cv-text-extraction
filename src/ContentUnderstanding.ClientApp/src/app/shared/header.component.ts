import { Component, computed, inject } from '@angular/core';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'app-header',
  template: `
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <h1 class="text-lg font-semibold text-slate-800">Content Understanding</h1>
        @if (account(); as acc) {
          <div class="flex items-center gap-3 text-sm">
            <span class="text-slate-600">{{ acc.name || acc.username }}</span>
            <button
              type="button"
              class="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
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
