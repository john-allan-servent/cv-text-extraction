import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <app-header />
    <main class="mx-auto max-w-4xl px-4 py-8">
      <router-outlet />
    </main>
  `,
})
export class App {}
