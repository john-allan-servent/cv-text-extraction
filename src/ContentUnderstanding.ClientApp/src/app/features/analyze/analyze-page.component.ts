import { Component, inject, signal } from '@angular/core';
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
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-semibold">Analyse a document</h2>
        <p class="text-slate-600">
          Upload a PDF, DOCX or TXT file (max {{ maxSizeMb }} MB) to extract its fields.
        </p>
      </div>

      <label
        class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition"
        [class]="dragging() ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-400'"
        (dragover)="onDragOver($event)"
        (dragleave)="dragging.set(false)"
        (drop)="onDrop($event)"
      >
        <span class="font-medium text-slate-700">Drop a file here or click to browse</span>
        <span class="mt-1 text-sm text-slate-500">{{ accept }}</span>
        <input
          type="file"
          class="sr-only"
          [accept]="accept"
          [disabled]="loading()"
          (change)="onFileSelected($event)"
        />
      </label>

      @if (loading()) {
        <div class="flex items-center gap-3 text-slate-600" role="status">
          <span class="size-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></span>
          Analysing {{ fileName() }}…
        </div>
      }

      @if (error(); as message) {
        <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800" role="alert">{{ message }}</div>
      }

      @if (result(); as r) {
        <app-analysis-result [result]="r" />
      }
    </div>
  `,
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

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file && !this.loading()) {
      this.upload(file);
    }
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.upload(file);
    }
    input.value = '';
  }

  private upload(file: File): void {
    this.result.set(null);
    this.error.set(null);

    const validationError = validateFile(file);
    if (validationError) {
      this.error.set(validationError);
      return;
    }

    this.fileName.set(file.name);
    this.loading.set(true);
    this.analysis.analyze(file).subscribe({
      next: (r) => {
        this.result.set(r);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }
}
