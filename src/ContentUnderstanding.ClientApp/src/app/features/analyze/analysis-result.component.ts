import { Component, computed, input } from '@angular/core';
import { AnalysisResult } from './analysis.service';

@Component({
  selector: 'app-analysis-result',
  template: `
    <section class="space-y-4">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="text-lg font-semibold">{{ result().fileName }}</h2>
        <p class="text-sm text-slate-500">
          @if (result().pageCount !== null) {
            {{ result().pageCount }} page(s) ·
          }
          {{ result().durationMs }} ms · {{ result().analyzerId }}
        </p>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Extracted content</h3>
        @if (entries().length) {
          <dl class="divide-y divide-slate-100">
            @for (entry of entries(); track entry.name) {
              <div class="grid grid-cols-1 gap-1 py-2 sm:grid-cols-3 sm:gap-4">
                <dt class="text-sm font-medium text-slate-500">{{ entry.name }}</dt>
                <dd class="break-words text-slate-800 sm:col-span-2">
                  @if (entry.values.length > 1) {
                    <ul class="list-disc space-y-0.5 pl-5">
                      @for (v of entry.values; track $index) {
                        <li>{{ v }}</li>
                      }
                    </ul>
                  } @else {
                    <span class="whitespace-pre-wrap">{{ entry.values[0] }}</span>
                  }
                </dd>
              </div>
            }
          </dl>
        } @else {
          <p class="text-slate-500">No content was extracted.</p>
        }
      </div>
    </section>
  `,
})
export class AnalysisResultComponent {
  readonly result = input.required<AnalysisResult>();

  protected readonly entries = computed(() =>
    Object.entries(this.result().fields ?? {}).map(([name, field]) => ({
      name,
      values: this.toDisplay(field),
    })),
  );

  // Unwraps field objects ({ value, ... }) and arrays of them into display strings.
  private toDisplay(field: unknown): string[] {
    if (field === null || field === undefined) {
      return [];
    }
    if (Array.isArray(field)) {
      return field.flatMap((item) => this.toDisplay(item));
    }
    if (typeof field === 'object') {
      const obj = field as Record<string, unknown>;
      if ('value' in obj) {
        return this.toDisplay(obj['value']);
      }
      const parts = Object.entries(obj).flatMap(([key, child]) => {
        const text = this.toDisplay(child).join(', ');
        return text ? [`${key}: ${text}`] : [];
      });
      return parts.length ? [parts.join(' · ')] : [];
    }
    return [String(field)];
  }
}
