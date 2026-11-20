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

export interface SelectOption {
  value: string;
  label: string;
}

let nextId = 0;

/** Select-only combobox (W3C APG) with optional search box on top of the listbox. */
@Component({
  selector: 'app-select',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative block',
    '(document:click)': 'onDocumentClick($event)',
  },
  styles: `
    .opt {
      transition:
        transform 150ms ease-out,
        background-color 150ms ease-out;
    }
    .opt::before {
      content: '';
      position: absolute;
      left: 0;
      top: 25%;
      bottom: 25%;
      width: 3px;
      border-radius: 2px;
      background: var(--c-brand);
      transform: scaleY(0);
      transition: transform 180ms ease-out;
    }
    .opt[data-active='true'] {
      transform: translateX(2px);
    }
    .opt[data-active='true']::before {
      transform: scaleY(1);
    }
    .check-pop {
      animation: check-pop 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    @keyframes check-pop {
      from {
        transform: scale(0);
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .opt,
      .opt::before {
        transition: none;
      }
      .check-pop {
        animation: none;
      }
    }
  `,
  template: `
    <button
      #trigger
      type="button"
      role="combobox"
      class="input flex min-w-0 items-center justify-between gap-2 text-left active:scale-[0.98] disabled:cursor-not-allowed"
      [class.pr-14]="showClear()"
      [class.border-brand]="emphasized()"
      [class.text-brand]="emphasized()"
      [attr.data-active]="emphasized() ? 'true' : null"
      [id]="inputId() || null"
      [disabled]="disabled()"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-expanded]="isOpen()"
      [attr.aria-controls]="panelId"
      [attr.aria-haspopup]="'listbox'"
      [attr.aria-required]="required() || null"
      [attr.aria-invalid]="(invalid() && touched()) || null"
      [attr.aria-activedescendant]="activeId()"
      (click)="toggle()"
      (keydown)="onTriggerKeydown($event)"
      (blur)="onTriggerBlur()"
    >
      <span class="min-w-0 flex-1 truncate" [class.text-ink-3]="!selectedLabel()">{{
        selectedLabel() || placeholder()
      }}</span>
      <app-icon
        name="chevron-down"
        class="text-ink-3 shrink-0 transition-transform duration-200 ease-out"
        [class.rotate-180]="isOpen()"
      />
    </button>

    @if (showClear()) {
      <button
        type="button"
        class="group text-ink-3 hover:text-ink absolute top-1/2 right-9 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg transition-colors duration-150"
        aria-label="Clear selection"
        (click)="clear()"
      >
        <app-icon
          name="x"
          [size]="14"
          class="transition-transform duration-200 ease-out group-hover:rotate-90"
        />
      </button>
    }

    @if (isOpen()) {
      <div
        class="pop-enter border-line bg-surface absolute inset-x-0 z-30 max-w-full overflow-hidden rounded-lg border shadow-lg"
        [class.top-full]="!openUp()"
        [class.mt-1.5]="!openUp()"
        [class.bottom-full]="openUp()"
        [class.mb-1.5]="openUp()"
      >
        @if (searchable()) {
          <div class="border-line relative border-b p-2">
            <app-icon
              name="search"
              [size]="16"
              class="text-ink-3 pointer-events-none absolute top-1/2 left-5 -translate-y-1/2"
            />
            <input
              #search
              type="text"
              role="combobox"
              aria-expanded="true"
              class="input min-h-10 pl-9"
              autocomplete="off"
              aria-label="Search"
              placeholder="Search"
              [attr.aria-controls]="listId"
              [attr.aria-activedescendant]="activeId()"
              [value]="query()"
              (input)="onSearch($event)"
              (keydown)="onListKeydown($event)"
            />
          </div>
        }
        <ul
          [id]="listId"
          role="listbox"
          [attr.aria-label]="ariaLabel() || placeholder()"
          class="max-h-64 overflow-y-auto overscroll-contain p-1"
        >
          @for (option of filtered(); track option.value; let i = $index) {
            <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- keyboard handled on the combobox via aria-activedescendant -->
            <li
              role="option"
              class="opt relative flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 text-sm sm:min-h-9"
              [id]="optionId(i)"
              [attr.data-active]="i === activeIndex() ? 'true' : null"
              [attr.aria-selected]="option.value === value()"
              [class.bg-brand-soft]="i === activeIndex()"
              [class.font-semibold]="option.value === value()"
              (click)="select(option)"
              (mousemove)="activeIndex.set(i)"
            >
              <span class="truncate">{{ option.label }}</span>
              @if (option.value === value()) {
                <app-icon name="check" [size]="16" class="check-pop text-brand shrink-0" />
              }
            </li>
          } @empty {
            <li class="text-ink-3 px-3 py-4 text-center text-sm" role="presentation">No results</li>
          }
        </ul>
      </div>
    }
  `,
})
export class Select implements FormValueControl<string> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly value = model('');
  readonly touched = input(false);
  readonly touch = output<void>();
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly required = input(false);

  readonly options = input.required<readonly SelectOption[]>();
  readonly searchable = input(false);
  readonly placeholder = input('Select');
  readonly inputId = input('');
  readonly ariaLabel = input('');
  readonly clearable = input(false);
  readonly emphasize = input(false);
  readonly direction = input<'auto' | 'up' | 'down'>('auto');

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('search');

  private readonly uid = `select-${nextId++}`;
  protected readonly panelId = `${this.uid}-panel`;
  protected readonly listId = `${this.uid}-list`;

  protected readonly isOpen = signal(false);
  protected readonly openUp = signal(false);
  protected readonly query = signal('');
  protected readonly activeIndex = signal(0);

  private typed = '';
  private typedTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly selectedLabel = computed(
    () => this.options().find((o) => o.value === this.value())?.label ?? '',
  );
  protected readonly emphasized = computed(() => this.emphasize() && this.value() !== '');
  protected readonly showClear = computed(
    () => this.clearable() && this.value() !== '' && !this.disabled(),
  );

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return q ? this.options().filter((o) => o.label.toLowerCase().includes(q)) : this.options();
  });

  protected readonly activeId = computed(() =>
    this.isOpen() && this.filtered().length > 0 ? this.optionId(this.activeIndex()) : null,
  );

  protected optionId(index: number): string {
    return `${this.uid}-opt-${index}`;
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
    this.query.set('');
    const selected = this.options().findIndex((o) => o.value === this.value());
    this.activeIndex.set(Math.max(selected, 0));
    this.openUp.set(this.shouldOpenUp());
    this.isOpen.set(true);
    afterNextRender(
      () => {
        if (this.searchable()) {
          this.searchBox()?.nativeElement.focus();
        }
        this.scrollActive();
      },
      { injector: this.injector },
    );
  }

  private shouldOpenUp(): boolean {
    const dir = this.direction();
    if (dir !== 'auto') {
      return dir === 'up';
    }
    const rect = this.host.nativeElement.getBoundingClientRect();
    const needed = Math.min(this.options().length * 44 + 16, 256) + (this.searchable() ? 56 : 0);
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

  protected select(option: SelectOption): void {
    this.value.set(option.value);
    this.close(true);
  }

  protected clear(): void {
    this.value.set('');
    this.touch.emit();
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.activeIndex.set(0);
  }

  protected onTriggerBlur(): void {
    if (!this.isOpen()) {
      this.touch.emit();
    }
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        this.open();
        return;
      }
      if (!this.searchable() && this.isTypeAhead(event)) {
        event.preventDefault();
        this.open();
        this.typeAhead(event.key);
      }
      return;
    }
    if (!this.searchable() && this.isTypeAhead(event)) {
      event.preventDefault();
      this.typeAhead(event.key);
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      this.selectActive();
      return;
    }
    this.onListKeydown(event);
  }

  protected onListKeydown(event: KeyboardEvent): void {
    const last = this.filtered().length - 1;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveTo(Math.min(this.activeIndex() + 1, last));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveTo(Math.max(this.activeIndex() - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        this.moveTo(0);
        break;
      case 'End':
        event.preventDefault();
        this.moveTo(last);
        break;
      case 'Enter':
        event.preventDefault();
        this.selectActive();
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.close(true);
        break;
      case 'Tab':
        this.close(false);
        break;
    }
  }

  private selectActive(): void {
    const option = this.filtered()[this.activeIndex()];
    if (option !== undefined) {
      this.select(option);
    }
  }

  private isTypeAhead(event: KeyboardEvent): boolean {
    return (
      event.key.length === 1 &&
      event.key !== ' ' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    );
  }

  private typeAhead(key: string): void {
    clearTimeout(this.typedTimer);
    this.typed += key.toLowerCase();
    this.typedTimer = setTimeout(() => (this.typed = ''), 600);
    const list = this.filtered();
    const start = this.typed.length === 1 ? this.activeIndex() + 1 : this.activeIndex();
    for (let n = 0; n < list.length; n++) {
      const i = (start + n) % list.length;
      if (list[i].label.toLowerCase().startsWith(this.typed)) {
        this.moveTo(i);
        return;
      }
    }
  }

  private moveTo(index: number): void {
    this.activeIndex.set(Math.max(index, 0));
    queueMicrotask(() => this.scrollActive());
  }

  private scrollActive(): void {
    this.host.nativeElement
      .querySelector(`#${CSS.escape(this.optionId(this.activeIndex()))}`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }

  protected onDocumentClick(event: Event): void {
    if (this.isOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close(false);
    }
  }
}
