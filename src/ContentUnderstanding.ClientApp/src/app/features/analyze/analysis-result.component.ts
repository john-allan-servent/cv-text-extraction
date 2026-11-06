import { Component, computed, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { AnalysisResult } from './analysis.service';

interface Entry {
  key?: string;
  name: string;
  values: string[];
}

interface Section {
  title: string;
  entries: Entry[];
}

const SECTION_RULES: { title: string; pattern: RegExp }[] = [
  { title: 'Contact', pattern: /email|phone|mobile|address|location|city|country|linkedin|website|url|contact/i },
  { title: 'Experience', pattern: /experience|employ|work|job|position|role|company|employer/i },
  { title: 'Education', pattern: /education|degree|school|universit|college|qualif|certif|course/i },
  { title: 'Skills', pattern: /skill|language|competenc|tool|technolog/i },
];

const OTHER_SECTION = 'Other fields';
const NAME_KEY = /^(candidate|full|person|applicant)?_?name$/i;

@Component({
  selector: 'app-analysis-result',
  template: `
    <article class="reveal space-y-8 border-t border-rule pt-8">
      <header class="space-y-3">
        <h2 #heading tabindex="-1" class="font-display text-3xl font-semibold tracking-tight text-balance outline-none sm:text-4xl">
          {{ title() }}
        </h2>
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <button type="button" class="min-h-9 rounded-md bg-accent px-3 font-medium text-white transition-opacity hover:opacity-90" (click)="copyAllText()">
            {{ isCopied('all-text') ? 'Copied ✓' : 'Copy all as text' }}
          </button>
          <button type="button" class="min-h-9 rounded-md border border-rule bg-sheet px-3 transition-colors hover:bg-accent-soft" (click)="copyJson()">
            {{ isCopied('all-json') ? 'Copied ✓' : 'Copy as JSON' }}
          </button>
          <button type="button" class="min-h-9 rounded-md border border-rule bg-sheet px-3 transition-colors hover:bg-accent-soft" (click)="download()">
            Download JSON
          </button>
          <button type="button" class="min-h-9 rounded-md px-3 text-muted underline-offset-4 hover:underline" (click)="dismissed.emit()">
            Clear
          </button>
        </div>
        <p class="text-sm" role="status">
          @if (copyError()) {
            <span class="text-danger">{{ copyError() }}</span>
          } @else if (announcement()) {
            <span class="sr-only">{{ announcement() }}</span>
          }
        </p>
      </header>

      @for (section of sections(); track section.title) {
        <section class="space-y-2" [attr.aria-label]="section.title">
          <div class="flex items-center justify-between gap-3">
            <h3 class="font-display text-xl font-semibold">{{ section.title }}</h3>
            <button
              type="button"
              class="min-h-8 rounded-md px-2 text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
              (click)="copySection(section)"
            >
              {{ isCopied('s:' + section.title) ? 'Copied ✓' : 'Copy section' }}
            </button>
          </div>
          <dl class="divide-y divide-rule rounded-lg border border-rule bg-sheet px-4">
            @for (entry of section.entries; track entry.name) {
              <div class="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
                <dt class="text-sm font-medium text-muted">{{ entry.name }}</dt>
                <dd class="min-w-0 break-words sm:col-span-2">
                  @if (entry.values.length > 1) {
                    <ul class="space-y-2">
                      @for (v of entry.values; track $index) {
                        <li class="flex items-start justify-between gap-3 rounded-md bg-paper px-3 py-2">
                          <span class="min-w-0 flex-1 whitespace-pre-wrap">{{ v }}</span>
                          <button
                            type="button"
                            class="min-h-8 shrink-0 rounded-md border border-rule bg-sheet px-3 text-sm text-muted transition-colors hover:bg-accent-soft hover:text-ink"
                            [attr.aria-label]="'Copy ' + entry.name + ' ' + ($index + 1)"
                            (click)="copyValue(section.title + entry.name + $index, v, entry.name)"
                          >
                            {{ isCopied(section.title + entry.name + $index) ? 'Copied ✓' : 'Copy' }}
                          </button>
                        </li>
                      }
                    </ul>
                  } @else {
                    <div class="flex items-start justify-between gap-3">
                      <span class="min-w-0 flex-1 whitespace-pre-wrap">{{ entry.values[0] }}</span>
                      <button
                        type="button"
                        class="min-h-8 shrink-0 rounded-md border border-rule bg-sheet px-3 text-sm text-muted transition-colors hover:bg-accent-soft hover:text-ink"
                        [attr.aria-label]="'Copy ' + entry.name"
                        (click)="copyValue(section.title + entry.name, entry.values[0], entry.name)"
                      >
                        {{ isCopied(section.title + entry.name) ? 'Copied ✓' : 'Copy' }}
                      </button>
                    </div>
                  }
                </dd>
              </div>
            }
          </dl>
        </section>
      } @empty {
        <p class="text-muted">
          Nothing could be extracted from this file. Check that it contains readable text, or try another version of the CV.
        </p>
      }

      <footer class="text-sm text-muted">
        {{ result().fileName }}
        @if (result().pageCount !== null) {
          · {{ result().pageCount }} {{ result().pageCount === 1 ? 'page' : 'pages' }}
        }
        · analysed in {{ seconds() }}s
      </footer>
    </article>
  `,
})
export class AnalysisResultComponent {
  readonly result = input.required<AnalysisResult>();
  readonly dismissed = output<void>();

  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly copiedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly announcement = signal('');
  protected readonly copyError = signal('');

  protected readonly seconds = computed(() => (this.result().durationMs / 1000).toFixed(1));

  private readonly allEntries = computed<Entry[]>(() =>
    Object.entries(this.result().fields ?? {})
      .map(([key, field]) => ({ key, values: this.toDisplay(field) }))
      .filter((e) => e.values.length > 0)
      .map((e) => ({ key: e.key, name: this.humanise(e.key), values: e.values })),
  );

  private readonly nameEntry = computed(() => this.allEntries().find((e) => NAME_KEY.test(e.key ?? '')));

  protected readonly title = computed(() => this.nameEntry()?.values[0] ?? this.result().fileName);

  protected readonly sections = computed<Section[]>(() => {
    const nameKey = this.nameEntry()?.key;
    const buckets = new Map<string, Entry[]>();
    for (const e of this.allEntries()) {
      if (e.key === nameKey) {
        continue;
      }
      const title = SECTION_RULES.find((r) => r.pattern.test(e.key ?? ''))?.title ?? OTHER_SECTION;
      buckets.set(title, [...(buckets.get(title) ?? []), { name: e.name, values: e.values }]);
    }
    const order = [...SECTION_RULES.map((r) => r.title), OTHER_SECTION];
    return order.filter((t) => buckets.has(t)).map((t) => ({ title: t, entries: buckets.get(t)! }));
  });

  constructor() {
    effect(() => {
      this.result();
      this.copiedIds.set(new Set());
      this.copyError.set('');
      queueMicrotask(() => this.heading()?.nativeElement.focus());
    });
  }

  protected isCopied(id: string): boolean {
    return this.copiedIds().has(id);
  }

  protected copyValue(id: string, value: string, label: string): Promise<void> {
    return this.copy(id, value, label);
  }

  protected copySection(section: Section): Promise<void> {
    const text = section.entries.map((e) => `${e.name}: ${e.values.join('; ')}`).join('\n');
    return this.copy('s:' + section.title, text, section.title);
  }

  protected copyAllText(): Promise<void> {
    const parts = this.sections().map(
      (s) => `${s.title}\n${s.entries.map((e) => `${e.name}: ${e.values.join('; ')}`).join('\n')}`,
    );
    return this.copy('all-text', [this.title(), ...parts].join('\n\n'), 'All fields');
  }

  protected copyJson(): Promise<void> {
    return this.copy('all-json', this.json(), 'JSON');
  }

  protected download(): void {
    const url = URL.createObjectURL(new Blob([this.json()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.result().fileName.replace(/\.[^.]+$/, '')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private async copy(id: string, text: string, label: string): Promise<void> {
    if (await this.writeToClipboard(text)) {
      this.copyError.set('');
      this.announcement.set(`Copied ${label}`);
      this.copiedIds.update((ids) => new Set(ids).add(id));
    } else {
      this.announcement.set('');
      this.copyError.set(`Couldn't copy ${label}. Select the text and press Ctrl+C instead.`);
    }
  }

  private async writeToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        return document.execCommand('copy');
      } catch {
        return false;
      } finally {
        area.remove();
      }
    }
  }

  private json(): string {
    return JSON.stringify(this.result().fields, null, 2);
  }

  private humanise(key: string): string {
    const spaced = key.replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim().toLowerCase();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

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
        return text ? [`${this.humanise(key)}: ${text}`] : [];
      });
      return parts.length ? [parts.join(' · ')] : [];
    }
    return [String(field)];
  }
}
