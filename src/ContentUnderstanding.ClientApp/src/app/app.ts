import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <app-header />
    <main id="main" class="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <router-outlet />
    </main>
  `,
})
export class App {}
