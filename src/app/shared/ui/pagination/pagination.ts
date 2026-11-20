import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { Select, type SelectOption } from '../select/select';

type PageItem = number | '...';

/** Table pagination: range summary, page-size select and page buttons with gaps. */
@Component({
  selector: 'app-pagination',
  imports: [Icon, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between' },
  template: `
    <p class="text-ink-2 text-sm" aria-live="polite">
      Showing
      @for (n of [from()]; track n) {
        <span class="num text-ink tick">{{ n }}</span>
      }
      to
      @for (n of [to()]; track n) {
        <span class="num text-ink tick">{{ n }}</span>
      }
      of
      @for (n of [total()]; track n) {
        <span class="num text-ink tick">{{ n }}</span>
      }
    </p>

    <div class="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
      <div class="flex items-center gap-2">
        <label for="pageSize" class="text-ink-2 text-sm">Rows per page</label>
        <app-select
          class="w-24 shrink-0"
          inputId="pageSize"
          ariaLabel="Rows per page"
          direction="up"
          [options]="sizeOptions()"
          [value]="'' + pageSize()"
          (valueChange)="onSize($event)"
        />
      </div>

      <nav aria-label="Pagination" class="flex items-center gap-1">
        <button
          type="button"
          class="btn-icon btn-secondary nav-btn size-10 border"
          aria-label="First page"
          [disabled]="atStart()"
          (click)="go(1)"
        >
          <app-icon name="chevrons-left" [size]="16" />
        </button>
        <button
          type="button"
          class="btn-icon btn-secondary nav-btn size-10 border"
          aria-label="Previous page"
          [disabled]="atStart()"
          (click)="go(page() - 1)"
        >
          <app-icon name="chevron-left" [size]="16" />
        </button>

        <span class="num text-ink-2 px-2 text-sm sm:hidden">{{ page() }} / {{ pages() }}</span>

        <span class="hidden items-center gap-1 sm:flex">
          @for (item of items(); track $index) {
            @if (item === '...') {
              <span class="text-ink-3 px-1 text-sm" aria-hidden="true">...</span>
            } @else {
              <button
                type="button"
                class="num page-btn min-h-10 min-w-10 rounded-lg px-2 text-sm font-medium transition duration-150 active:scale-90"
                [class]="
                  item === page()
                    ? 'page-active bg-brand text-on-brand'
                    : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                "
                [attr.aria-current]="item === page() ? 'page' : null"
                [attr.aria-label]="'Page ' + item"
                (click)="go(item)"
              >
                {{ item }}
              </button>
            }
          }
        </span>

        <button
          type="button"
          class="btn-icon btn-secondary nav-btn size-10 border"
          aria-label="Next page"
          [disabled]="atEnd()"
          (click)="go(page() + 1)"
        >
          <app-icon name="chevron-right" [size]="16" />
        </button>
        <button
          type="button"
          class="btn-icon btn-secondary nav-btn size-10 border"
          aria-label="Last page"
          [disabled]="atEnd()"
          (click)="go(pages())"
        >
          <app-icon name="chevrons-right" [size]="16" />
        </button>
      </nav>
    </div>
  `,
  styles: `
    .tick {
      display: inline-block;
      animation: tick-in 220ms ease-out both;
    }
    @keyframes tick-in {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
    }
    .page-active {
      animation: page-pop 220ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    @keyframes page-pop {
      from {
        transform: scale(0.8);
      }
    }
    .nav-btn app-icon {
      transition: transform 150ms ease-out;
    }
    .nav-btn[aria-label$='page']:hover app-icon {
      transform: translateX(2px);
    }
    .nav-btn[aria-label='Previous page']:hover app-icon,
    .nav-btn[aria-label='First page']:hover app-icon {
      transform: translateX(-2px);
    }
    @media (prefers-reduced-motion: reduce) {
      .tick,
      .page-active {
        animation: none;
      }
      .nav-btn app-icon {
        transition: none;
      }
    }
    button:disabled {
      opacity: 0.4;
      pointer-events: none;
    }
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly pages = input.required<number>();
  readonly total = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly pageSizes = input<readonly number[]>([10, 25, 50]);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  protected readonly sizeOptions = computed<SelectOption[]>(() =>
    this.pageSizes().map((n) => ({ value: String(n), label: String(n) })),
  );

  protected readonly from = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1,
  );
  protected readonly to = computed(() => Math.min(this.page() * this.pageSize(), this.total()));
  protected readonly atStart = computed(() => this.page() <= 1);
  protected readonly atEnd = computed(() => this.page() >= this.pages());

  protected readonly items = computed<PageItem[]>(() => {
    const last = this.pages();
    const current = this.page();
    if (last <= 7) {
      return Array.from({ length: last }, (_, i) => i + 1);
    }

    const wanted = new Set([1, last, current - 1, current, current + 1]);
    const sorted = [...wanted].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);

    const result: PageItem[] = [];
    sorted.forEach((n, i) => {
      if (i > 0 && n - sorted[i - 1] > 1) {
        result.push('...');
      }
      result.push(n);
    });
    return result;
  });

  protected go(target: number): void {
    const next = Math.min(Math.max(target, 1), Math.max(this.pages(), 1));
    if (next !== this.page()) {
      this.pageChange.emit(next);
    }
  }

  protected onSize(value: string): void {
    const size = Number(value);
    if (size !== this.pageSize()) {
      this.pageSizeChange.emit(size);
    }
  }
}
