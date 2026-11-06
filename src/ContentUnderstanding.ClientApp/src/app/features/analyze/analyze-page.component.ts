import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisResultComponent } from './analysis-result.component';
import {
  ALLOWED_EXTENSIONS,
  AnalysisResult,
  AnalysisService,
  MAX_FILE_SIZE_MB,
  validateFile,
} from './analysis.service';

@Component({
  selector: 'app-analyze-page',
  imports: [AnalysisResultComponent],
  template: `
    <div class="space-y-8">
      <div class="space-y-2">
        <h1 class="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Turn a CV into copyable fields
        </h1>
        <p class="max-w-prose text-lg text-muted">
          Upload a CV and copy each detail, section or the whole lot straight into another application.
        </p>
      </div>

      <label
        class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors focus-within:border-accent focus-within:bg-accent-soft"
        [class]="dragging() ? 'border-accent bg-accent-soft' : 'border-rule bg-sheet hover:border-accent'"
        [class.pointer-events-none]="loading()"
        [class.opacity-60]="loading()"
        (dragover)="onDragOver($event)"
        (dragleave)="dragging.set(false)"
        (drop)="onDrop($event)"
      >
        <span class="font-display text-xl font-medium">
          {{ result() ? 'Drop another CV, or browse' : 'Drop a CV here, or browse' }}
        </span>
        <span class="mt-1 text-sm text-muted">PDF, DOCX or TXT · up to {{ maxSizeMb }} MB · one file at a time</span>
        <input
          type="file"
          class="sr-only"
          [accept]="accept"
          [disabled]="loading()"
          (change)="onFileSelected($event)"
        />
      </label>

      <p class="-mt-4 text-sm text-ink">
        Privacy: your file is sent to Azure AI Content Understanding for analysis.
      </p>

      <div aria-live="polite">
        @if (loading()) {
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted" role="status">
            <span class="size-5 animate-spin rounded-full border-2 border-accent border-t-transparent"></span>
            <span>Reading {{ fileName() }}… {{ elapsed() }}s</span>
            <button
              type="button"
              class="rounded-md border border-rule bg-sheet px-3 py-1 text-sm text-ink transition-colors hover:bg-accent-soft"
              (click)="cancel()"
            >
              Cancel
            </button>
          </div>
        }

        @if (error(); as message) {
          <div class="space-y-3 rounded-lg border border-danger/30 bg-danger-soft p-4 text-danger" role="alert">
            <p>{{ message }}</p>
            @if (lastFile()) {
              <button
                type="button"
                class="rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                (click)="retry()"
              >
                Try again
              </button>
            }
          </div>
        }
      </div>

      @if (result(); as r) {
        <div [class.opacity-50]="loading()" class="transition-opacity">
          <app-analysis-result [result]="r" (dismissed)="clear()" />
        </div>
      }
    </div>
  `,
  host: {
    '(window:dragover)': '$event.preventDefault()',
    '(window:drop)': '$event.preventDefault()',
  },
})
export class AnalyzePageComponent {
  private readonly analysis = inject(AnalysisService);

  protected readonly accept = ALLOWED_EXTENSIONS.join(',');
  protected readonly maxSizeMb = MAX_FILE_SIZE_MB;
  protected readonly dragging = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<AnalysisResult | null>(null);
  protected readonly fileName = signal('');
  protected readonly elapsed = signal(0);
  protected readonly lastFile = signal<File | null>(null);

  private subscription?: Subscription;
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.loading()) {
      this.dragging.set(true);
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const files = event.dataTransfer?.files;
    if (!files?.length || this.loading()) {
      return;
    }
    this.upload(files[0]);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.upload(file);
    }
    input.value = '';
  }

  protected retry(): void {
    const file = this.lastFile();
    if (file) {
      this.upload(file);
    }
  }

  protected cancel(): void {
    this.stop();
    this.loading.set(false);
  }

  protected clear(): void {
    this.result.set(null);
    this.error.set(null);
    this.lastFile.set(null);
  }

  private upload(file: File): void {
    this.error.set(null);

    const validationError = validateFile(file);
    if (validationError) {
      this.error.set(validationError);
      this.lastFile.set(null);
      return;
    }

    this.lastFile.set(file);
    this.fileName.set(file.name);
    this.elapsed.set(0);
    this.loading.set(true);
    this.stop();
    this.timer = setInterval(() => this.elapsed.update((s) => s + 1), 1000);
    this.subscription = this.analysis.analyze(file).subscribe({
      next: (r) => {
        this.stop();
        this.result.set(r);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.stop();
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  private stop(): void {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
    clearInterval(this.timer);
    this.timer = undefined;
  }
}
