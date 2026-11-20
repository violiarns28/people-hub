import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { Icon } from '../icon/icon';
import {
  MONTHS_LONG,
  MONTHS_SHORT,
  addDays,
  addMonths,
  clampIso,
  daysInMonth,
  formatDisplay,
  isInRange,
  mondayOffset,
  monthEnd,
  monthGrid,
  monthStart,
  parseIso,
  parseTyped,
  toIso,
  todayIso,
} from './date-utils';

type View = 'day' | 'month' | 'year';

interface DayCell {
  iso: string;
  day: number;
  muted: boolean;
  disabled: boolean;
  selected: boolean;
  today: boolean;
  focus: boolean;
  label: string;
}

interface PickCell {
  n: number;
  label: string;
  disabled: boolean;
  selected: boolean;
  current: boolean;
  focus: boolean;
}

const WEEKDAYS = [
  ['Mo', 'Monday'],
  ['Tu', 'Tuesday'],
  ['We', 'Wednesday'],
  ['Th', 'Thursday'],
  ['Fr', 'Friday'],
  ['Sa', 'Saturday'],
  ['Su', 'Sunday'],
] as const;

const CELL =
  'flex h-11 w-full items-center justify-center rounded-lg border text-sm transition-[color,background-color,transform] duration-100 outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30 sm:h-9';

let nextId = 0;

/** Date picker (W3C APG datepicker dialog) with day, month and year views. Value is `yyyy-MM-dd` or ''. */
@Component({
  selector: 'app-date-picker',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative block',
    '(document:click)': 'onDocumentClick($event)',
  },
  template: `
    <button
      #trigger
      type="button"
      role="combobox"
      class="input flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed"
      [id]="inputId() || null"
      [disabled]="disabled()"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-expanded]="isOpen()"
      [attr.aria-controls]="isOpen() ? dialogId : null"
      aria-haspopup="dialog"
      [attr.aria-required]="required() || null"
      [attr.aria-invalid]="(invalid() && touched()) || null"
      (click)="toggle()"
      (keydown)="onTriggerKeydown($event)"
      (blur)="onTriggerBlur()"
    >
      <span class="truncate" [class.text-ink-3]="!display()">{{ display() || placeholder() }}</span>
      <app-icon name="calendar" class="text-ink-3 shrink-0" />
    </button>

    @if (isOpen()) {
      <div
        #dialog
        role="dialog"
        aria-label="Choose date"
        [id]="dialogId"
        class="pop-enter border-line bg-surface absolute left-0 z-30 w-full max-w-[calc(100vw-2rem)] rounded-lg border p-3 sm:w-80"
        style="box-shadow: var(--shadow-pop)"
        [class.top-full]="!openUp()"
        [class.mt-1.5]="!openUp()"
        [class.bottom-full]="openUp()"
        [class.mb-1.5]="openUp()"
        (keydown)="onDialogKeydown($event)"
      >
        <div class="mb-3">
          <label [for]="textId" class="text-ink-2 mb-1 block text-xs font-medium"
            >Type a date</label
          >
          <input
            type="text"
            class="input min-h-10"
            autocomplete="off"
            placeholder="dd/mm/yyyy"
            [id]="textId"
            [value]="text()"
            [attr.aria-invalid]="error() ? 'true' : null"
            [attr.aria-describedby]="error() ? errorId : null"
            (input)="onText($event)"
            (keydown.enter)="commitText($event)"
          />
          @if (error()) {
            <p [id]="errorId" class="text-bad mt-1 text-xs font-medium">{{ error() }}</p>
          }
        </div>

        <div class="mb-2 flex items-center justify-between gap-1">
          <div class="flex items-center">
            @if (view() === 'day') {
              <button
                type="button"
                class="nav-btn"
                aria-label="Previous year"
                [disabled]="prevYearDisabled()"
                (click)="shift(-12)"
              >
                <app-icon name="chevrons-left" [size]="16" />
              </button>
              <button
                type="button"
                class="nav-btn"
                aria-label="Previous month"
                [disabled]="prevDisabled()"
                (click)="shift(-1)"
              >
                <app-icon name="chevron-left" [size]="16" />
              </button>
            } @else {
              <button
                type="button"
                class="nav-btn"
                [attr.aria-label]="view() === 'month' ? 'Previous year' : 'Previous years'"
                [disabled]="prevDisabled()"
                (click)="shift(-1)"
              >
                <app-icon name="chevron-left" [size]="16" />
              </button>
            }
          </div>
          <button
            type="button"
            class="hover:bg-surface-2 focus-visible:ring-brand/30 min-h-10 min-w-0 flex-1 truncate rounded-lg px-2 text-sm font-semibold transition-colors duration-100 outline-none focus-visible:ring-[3px]"
            [attr.aria-label]="titleLabel()"
            (click)="cycleView()"
          >
            {{ title() }}
          </button>
          <div class="flex items-center">
            @if (view() === 'day') {
              <button
                type="button"
                class="nav-btn"
                aria-label="Next month"
                [disabled]="nextDisabled()"
                (click)="shift(1)"
              >
                <app-icon name="chevron-right" [size]="16" />
              </button>
              <button
                type="button"
                class="nav-btn"
                aria-label="Next year"
                [disabled]="nextYearDisabled()"
                (click)="shift(12)"
              >
                <app-icon name="chevrons-right" [size]="16" />
              </button>
            } @else {
              <button
                type="button"
                class="nav-btn"
                [attr.aria-label]="view() === 'month' ? 'Next year' : 'Next years'"
                [disabled]="nextDisabled()"
                (click)="shift(1)"
              >
                <app-icon name="chevron-right" [size]="16" />
              </button>
            }
          </div>
        </div>

        <div class="sr-only" aria-live="polite" aria-atomic="true">{{ title() }}</div>

        <div [class]="slideClass()">
          @switch (view()) {
            @case ('day') {
              <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -- keydown bubbles from the focused roving gridcell -->
              <div role="grid" [attr.aria-label]="title()" (keydown)="onGridKeydown($event)">
                <div role="row" class="mb-1 grid grid-cols-7">
                  @for (w of weekdays; track w[0]) {
                    <div
                      role="columnheader"
                      class="text-ink-3 flex h-8 items-center justify-center text-xs font-medium"
                    >
                      <abbr [attr.title]="w[1]" class="no-underline">{{ w[0] }}</abbr>
                    </div>
                  }
                </div>
                @for (week of weeks(); track week[0].iso) {
                  <div role="row" class="grid grid-cols-7 gap-y-0.5">
                    @for (c of week; track c.iso) {
                      <button
                        type="button"
                        role="gridcell"
                        [class]="dayClass(c)"
                        [attr.data-iso]="c.iso"
                        [attr.aria-label]="c.label"
                        [attr.aria-selected]="c.selected"
                        [attr.aria-disabled]="c.disabled || null"
                        [attr.aria-current]="c.today ? 'date' : null"
                        [attr.tabindex]="c.focus ? 0 : -1"
                        (click)="pickDay(c)"
                      >
                        {{ c.day }}
                      </button>
                    }
                  </div>
                }
              </div>
            }
            @case ('month') {
              <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -- keydown bubbles from the focused roving gridcell -->
              <div
                role="grid"
                aria-label="Choose month"
                class="grid grid-cols-3 gap-1"
                (keydown)="onGridKeydown($event)"
              >
                @for (c of months(); track c.n) {
                  <button
                    type="button"
                    role="gridcell"
                    [class]="pickClass(c)"
                    [attr.aria-label]="c.label"
                    [attr.aria-selected]="c.selected"
                    [attr.aria-disabled]="c.disabled || null"
                    [attr.aria-current]="c.current ? 'date' : null"
                    [attr.tabindex]="c.focus ? 0 : -1"
                    (click)="pickMonth(c)"
                  >
                    {{ c.label }}
                  </button>
                }
              </div>
            }
            @default {
              <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -- keydown bubbles from the focused roving gridcell -->
              <div
                role="grid"
                aria-label="Choose year"
                class="grid grid-cols-3 gap-1"
                (keydown)="onGridKeydown($event)"
              >
                @for (c of years(); track c.n) {
                  <button
                    type="button"
                    role="gridcell"
                    [class]="pickClass(c)"
                    [attr.aria-selected]="c.selected"
                    [attr.aria-disabled]="c.disabled || null"
                    [attr.aria-current]="c.current ? 'date' : null"
                    [attr.tabindex]="c.focus ? 0 : -1"
                    (click)="pickYear(c)"
                  >
                    {{ c.label }}
                  </button>
                }
              </div>
            }
          }
        </div>

        <div class="border-line mt-3 flex items-center justify-between border-t pt-2">
          <button
            type="button"
            class="ul-btn text-brand hover:bg-surface-2 focus-visible:ring-brand/30 min-h-10 rounded-lg px-3 text-sm font-medium transition-colors duration-100 outline-none focus-visible:ring-[3px] disabled:opacity-50"
            [disabled]="!todayInRange()"
            (click)="pickToday()"
          >
            Today
          </button>
          <button
            type="button"
            class="ul-btn text-ink-2 hover:bg-surface-2 focus-visible:ring-brand/30 min-h-10 rounded-lg px-3 text-sm font-medium transition-colors duration-100 outline-none focus-visible:ring-[3px]"
            (click)="clear()"
          >
            Clear
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .sl-next-a {
      animation: sl-next-a 0.2s var(--ease-out-quint) both;
    }
    .sl-next-b {
      animation: sl-next-b 0.2s var(--ease-out-quint) both;
    }
    .sl-prev-a {
      animation: sl-prev-a 0.2s var(--ease-out-quint) both;
    }
    .sl-prev-b {
      animation: sl-prev-b 0.2s var(--ease-out-quint) both;
    }
    @keyframes sl-next-a {
      from {
        opacity: 0;
        transform: translateX(16px);
      }
    }
    @keyframes sl-next-b {
      from {
        opacity: 0;
        transform: translateX(16px);
      }
    }
    @keyframes sl-prev-a {
      from {
        opacity: 0;
        transform: translateX(-16px);
      }
    }
    @keyframes sl-prev-b {
      from {
        opacity: 0;
        transform: translateX(-16px);
      }
    }
    .day-pop {
      animation: day-pop 0.2s var(--ease-out-quint) both;
    }
    @keyframes day-pop {
      from {
        transform: scale(0.85);
      }
      60% {
        transform: scale(1.08);
      }
    }
    .ul-btn {
      position: relative;
    }
    .ul-btn::after {
      content: '';
      position: absolute;
      left: 0.75rem;
      right: 0.75rem;
      bottom: 0.5rem;
      height: 2px;
      background: currentColor;
      transform: scaleX(0);
      transform-origin: left center;
      transition: transform 0.18s ease-out;
    }
    .ul-btn:hover:not(:disabled)::after,
    .ul-btn:focus-visible::after {
      transform: scaleX(1);
    }
    @media (prefers-reduced-motion: reduce) {
      .sl-next-a,
      .sl-next-b,
      .sl-prev-a,
      .sl-prev-b,
      .day-pop {
        animation: none;
      }
      .ul-btn::after {
        transition: none;
      }
    }
    .nav-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2.5rem;
      border-radius: 0.5rem;
      color: var(--color-ink-2);
      outline: none;
      transition: background-color 120ms;
    }
    .nav-btn:hover:not(:disabled) {
      background: var(--color-surface-2);
    }
    .nav-btn:focus-visible {
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand) 30%, transparent);
    }
    .nav-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `,
})
export class DatePicker implements FormValueControl<string> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly value = model('');
  readonly touched = input(false);
  readonly touch = output<void>();
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly required = input(false);

  readonly inputId = input('');
  readonly min = input<string | undefined>('1900-01-01');
  readonly max = input<string | undefined>(todayIso());
  readonly placeholder = input('Select date');
  readonly ariaLabel = input('');

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');

  private readonly uid = `date-picker-${nextId++}`;
  protected readonly dialogId = `${this.uid}-dialog`;
  protected readonly textId = `${this.uid}-text`;
  protected readonly errorId = `${this.uid}-error`;
  protected readonly weekdays = WEEKDAYS;

  protected readonly isOpen = signal(false);
  /** Alternating class names re-trigger the horizontal slide on every change. */
  protected readonly slideClass = signal('');
  private slideFlip = false;
  protected readonly openUp = signal(false);
  protected readonly view = signal<View>('day');
  /** The focused / navigated day (always within min and max). */
  protected readonly cursor = signal('');
  protected readonly text = signal('');
  protected readonly error = signal('');

  private readonly today = todayIso();

  protected readonly minIso = computed(() =>
    parseIso(this.min() ?? '') ? this.min()! : '1900-01-01',
  );
  protected readonly maxIso = computed(() =>
    parseIso(this.max() ?? '') ? this.max()! : this.today,
  );

  protected readonly display = computed(() => formatDisplay(this.value()));
  protected readonly todayInRange = computed(() =>
    isInRange(this.today, this.minIso(), this.maxIso()),
  );

  private readonly cursorYmd = computed(
    () => parseIso(this.cursor()) ?? parseIso(this.today) ?? { y: 2000, m: 1, d: 1 },
  );
  private readonly yearStart = computed(() => {
    const y = this.cursorYmd().y;
    return y - (y % 12);
  });

  protected readonly title = computed(() => {
    const { y, m } = this.cursorYmd();
    switch (this.view()) {
      case 'day':
        return `${MONTHS_LONG[m - 1]} ${y}`;
      case 'month':
        return `${y}`;
      default:
        return `${this.yearStart()} - ${this.yearStart() + 11}`;
    }
  });

  protected readonly titleLabel = computed(() => {
    switch (this.view()) {
      case 'day':
        return `${this.title()}, choose month`;
      case 'month':
        return `${this.title()}, choose year`;
      default:
        return `${this.title()}, back to calendar`;
    }
  });

  protected readonly weeks = computed<DayCell[][]>(() => {
    const cursor = this.cursor();
    const month = this.cursorYmd().m;
    const min = this.minIso();
    const max = this.maxIso();
    const value = this.value();
    const cells = monthGrid(cursor).map((iso): DayCell => {
      const p = parseIso(iso)!;
      return {
        iso,
        day: p.d,
        muted: p.m !== month,
        disabled: !isInRange(iso, min, max),
        selected: iso === value,
        today: iso === this.today,
        focus: iso === cursor,
        label: `${p.d} ${MONTHS_LONG[p.m - 1]} ${p.y}`,
      };
    });
    return Array.from({ length: 6 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  });

  protected readonly months = computed<PickCell[]>(() => {
    const { y, m } = this.cursorYmd();
    const sel = parseIso(this.value());
    const now = parseIso(this.today)!;
    return MONTHS_SHORT.map((label, i) => {
      const iso = toIso(y, i + 1, 1);
      return {
        n: i + 1,
        label,
        disabled: monthEnd(iso) < this.minIso() || iso > this.maxIso(),
        selected: sel?.y === y && sel.m === i + 1,
        current: now.y === y && now.m === i + 1,
        focus: i + 1 === m,
      };
    });
  });

  protected readonly years = computed<PickCell[]>(() => {
    const start = this.yearStart();
    const cy = this.cursorYmd().y;
    const sel = parseIso(this.value());
    const now = parseIso(this.today)!;
    const minY = parseIso(this.minIso())!.y;
    const maxY = parseIso(this.maxIso())!.y;
    return Array.from({ length: 12 }, (_, i) => {
      const y = start + i;
      return {
        n: y,
        label: String(y),
        disabled: y < minY || y > maxY,
        selected: sel?.y === y,
        current: now.y === y,
        focus: y === cy,
      };
    });
  });

  protected readonly prevDisabled = computed(() => {
    switch (this.view()) {
      case 'day':
        return monthStart(this.cursor()) <= this.minIso();
      case 'month':
        return this.cursorYmd().y <= parseIso(this.minIso())!.y;
      default:
        return this.yearStart() <= parseIso(this.minIso())!.y;
    }
  });

  protected readonly nextDisabled = computed(() => {
    switch (this.view()) {
      case 'day':
        return monthEnd(this.cursor()) >= this.maxIso();
      case 'month':
        return this.cursorYmd().y >= parseIso(this.maxIso())!.y;
      default:
        return this.yearStart() + 11 >= parseIso(this.maxIso())!.y;
    }
  });

  protected readonly prevYearDisabled = computed(
    () => this.cursorYmd().y <= parseIso(this.minIso())!.y,
  );
  protected readonly nextYearDisabled = computed(
    () => this.cursorYmd().y >= parseIso(this.maxIso())!.y,
  );

  protected dayClass(c: DayCell): string {
    let state: string;
    if (c.selected) {
      state = 'day-pop bg-brand text-on-brand font-semibold border-brand';
    } else if (c.disabled) {
      state = 'text-ink-3 opacity-40 cursor-not-allowed border-transparent';
    } else {
      const tone = c.muted ? 'text-ink-3' : 'text-ink';
      const ring = c.today ? 'border-brand' : 'border-transparent';
      state = `${tone} ${ring} hover:bg-surface-2 hover:scale-[1.06] cursor-pointer`;
    }
    return `${CELL} ${state}`;
  }

  protected pickClass(c: PickCell): string {
    let state: string;
    if (c.selected) {
      state = 'day-pop bg-brand text-on-brand font-semibold border-brand';
    } else if (c.disabled) {
      state = 'text-ink-3 opacity-40 cursor-not-allowed border-transparent';
    } else {
      state = `text-ink ${c.current ? 'border-brand' : 'border-transparent'} hover:bg-surface-2 hover:scale-[1.06] cursor-pointer`;
    }
    return `${CELL} ${state}`;
  }

  protected toggle(): void {
    if (this.isOpen()) {
      this.close(false);
    } else {
      this.open();
    }
  }

  private open(): void {
    if (this.disabled() || this.isOpen()) {
      return;
    }
    const value = this.value();
    const start =
      parseIso(value) && isInRange(value, this.minIso(), this.maxIso()) ? value : this.today;
    this.cursor.set(clampIso(start, this.minIso(), this.maxIso()));
    this.view.set('day');
    this.slideClass.set('');
    this.text.set('');
    this.error.set('');
    this.openUp.set(this.shouldOpenUp());
    this.isOpen.set(true);
    this.focusActive();
  }

  private shouldOpenUp(): boolean {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const needed = 440;
    const below = window.innerHeight - rect.bottom;
    return below < needed && rect.top > below;
  }

  private close(refocus: boolean): void {
    if (!this.isOpen()) {
      return;
    }
    this.isOpen.set(false);
    if (refocus) {
      this.trigger()?.nativeElement.focus();
    }
    this.touch.emit();
  }

  private focusActive(): void {
    afterNextRender(
      () => {
        this.dialog()
          ?.nativeElement.querySelector<HTMLElement>('[role=gridcell][tabindex="0"]')
          ?.focus();
      },
      { injector: this.injector },
    );
  }

  private setCursor(iso: string): void {
    this.cursor.set(clampIso(iso, this.minIso(), this.maxIso()));
    this.focusActive();
  }

  /** Prev/next for the current view: day = months (or 12 for years), month = years, year = pages. */
  private slide(dir: 'next' | 'prev'): void {
    this.slideFlip = !this.slideFlip;
    this.slideClass.set(`sl-${dir}-${this.slideFlip ? 'a' : 'b'}`);
  }

  protected shift(n: number): void {
    this.slide(n > 0 ? 'next' : 'prev');
    const view = this.view();
    const step = view === 'day' ? n : view === 'month' ? n * 12 : n * 144;
    this.cursor.set(clampIso(addMonths(this.cursor(), step), this.minIso(), this.maxIso()));
  }

  protected cycleView(): void {
    const next: Record<View, View> = { day: 'month', month: 'year', year: 'day' };
    this.slide(this.view() === 'year' ? 'prev' : 'next');
    this.view.set(next[this.view()]);
    this.focusActive();
  }

  protected pickDay(c: DayCell): void {
    if (!c.disabled) {
      this.select(c.iso);
    }
  }

  protected pickMonth(c: PickCell): void {
    if (c.disabled) {
      return;
    }
    const { y, d } = this.cursorYmd();
    this.setCursor(toIso(y, c.n, Math.min(d, daysInMonth(y, c.n))));
    this.slide('prev');
    this.view.set('day');
  }

  protected pickYear(c: PickCell): void {
    if (c.disabled) {
      return;
    }
    const { m, d } = this.cursorYmd();
    this.setCursor(toIso(c.n, m, Math.min(d, daysInMonth(c.n, m))));
    this.slide('prev');
    this.view.set('month');
  }

  protected pickToday(): void {
    if (this.todayInRange()) {
      this.select(this.today);
    }
  }

  private select(iso: string): void {
    this.value.set(iso);
    this.close(true);
  }

  protected clear(): void {
    this.value.set('');
    this.close(true);
  }

  protected onText(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.text.set(raw);
    this.error.set('');
    const iso = parseTyped(raw);
    if (iso && isInRange(iso, this.minIso(), this.maxIso())) {
      this.cursor.set(iso);
    }
  }

  protected commitText(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const iso = parseTyped(this.text());
    if (!iso) {
      this.error.set('Enter a valid date as dd/mm/yyyy');
      return;
    }
    if (!isInRange(iso, this.minIso(), this.maxIso())) {
      this.error.set(
        `Date must be between ${formatDisplay(this.minIso())} and ${formatDisplay(this.maxIso())}`,
      );
      return;
    }
    this.select(iso);
  }

  protected onTriggerBlur(): void {
    if (!this.isOpen()) {
      this.touch.emit();
    }
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) {
      if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        this.open();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close(true);
    }
  }

  protected onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close(true);
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const root = this.dialog()?.nativeElement;
    if (!root) {
      return;
    }
    const items = Array.from(
      root.querySelectorAll<HTMLElement>(
        'input, button:not([disabled]):not([tabindex="-1"]), [role=gridcell][tabindex="0"]',
      ),
    );
    if (items.length === 0) {
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const view = this.view();
    const cursor = this.cursor();
    const key = event.key;
    let next: string | null = null;

    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      this.activate();
      return;
    }

    if (view === 'day') {
      const off = mondayOffset(cursor);
      switch (key) {
        case 'ArrowLeft':
          next = addDays(cursor, -1);
          break;
        case 'ArrowRight':
          next = addDays(cursor, 1);
          break;
        case 'ArrowUp':
          next = addDays(cursor, -7);
          break;
        case 'ArrowDown':
          next = addDays(cursor, 7);
          break;
        case 'Home':
          next = addDays(cursor, -off);
          break;
        case 'End':
          next = addDays(cursor, 6 - off);
          break;
        case 'PageUp':
          next = addMonths(cursor, event.shiftKey ? -12 : -1);
          break;
        case 'PageDown':
          next = addMonths(cursor, event.shiftKey ? 12 : 1);
          break;
      }
    } else {
      // Month grid steps in months, year grid steps in years (both 3 columns).
      const unit = view === 'month' ? 1 : 12;
      const page = view === 'month' ? 12 : 144;
      switch (key) {
        case 'ArrowLeft':
          next = addMonths(cursor, -unit);
          break;
        case 'ArrowRight':
          next = addMonths(cursor, unit);
          break;
        case 'ArrowUp':
          next = addMonths(cursor, -3 * unit);
          break;
        case 'ArrowDown':
          next = addMonths(cursor, 3 * unit);
          break;
        case 'PageUp':
          next = addMonths(cursor, -page);
          break;
        case 'PageDown':
          next = addMonths(cursor, page);
          break;
        case 'Home':
          next = addMonths(cursor, -(this.rowIndex() * unit));
          break;
        case 'End':
          next = addMonths(cursor, (2 - this.rowIndex()) * unit);
          break;
      }
    }

    if (next !== null) {
      event.preventDefault();
      this.setCursor(next);
    }
  }

  /** Column (0-2) of the cursor inside the 3 column month / year grid. */
  private rowIndex(): number {
    const { y, m } = this.cursorYmd();
    return this.view() === 'month' ? (m - 1) % 3 : (y - this.yearStart()) % 3;
  }

  private activate(): void {
    const view = this.view();
    const { y, m } = this.cursorYmd();
    if (view === 'day') {
      this.select(this.cursor());
    } else if (view === 'month') {
      this.pickMonth({ n: m } as PickCell & { disabled: false });
    } else {
      this.pickYear({ n: y } as PickCell & { disabled: false });
    }
  }

  protected onDocumentClick(event: Event): void {
    if (this.isOpen() && !event.composedPath().includes(this.host.nativeElement)) {
      this.close(false);
    }
  }
}
