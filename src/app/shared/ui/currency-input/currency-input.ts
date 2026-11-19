import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

const MAX_DIGITS = 13;
const formatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/** Rupiah amount input: digits only, live "." thousands separators, numeric model value. */
@Component({
  selector: 'app-currency-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block' },
  template: `
    <span
      class="text-ink-3 pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-medium"
      aria-hidden="true"
      >Rp</span
    >
    <input
      type="text"
      inputmode="numeric"
      autocomplete="off"
      class="input num pl-10"
      placeholder="0"
      [id]="inputId() || null"
      [value]="display()"
      [disabled]="disabled()"
      [attr.aria-invalid]="(invalid() && touched()) || null"
      [attr.aria-required]="required() || null"
      (input)="onInput($event)"
      (blur)="touch.emit()"
    />
  `,
})
export class CurrencyInput implements FormValueControl<number> {
  readonly value = model(0);
  readonly touched = input(false);
  readonly touch = output<void>();
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly required = input(false);

  readonly inputId = input('');

  protected readonly display = computed(() => {
    const v = this.value();
    return v > 0 ? formatter.format(v) : '';
  });

  protected onInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const caret = el.selectionStart ?? el.value.length;
    const digitsBeforeCaret = el.value.slice(0, caret).replace(/\D/g, '').length;

    const digits = el.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS);
    const amount = digits ? Number(digits) : 0;
    const formatted = digits ? formatter.format(amount) : '';

    el.value = formatted;
    this.value.set(amount);

    // Put the caret after the same number of digits it followed before reformatting.
    let seen = 0;
    let pos = 0;
    while (pos < formatted.length && seen < Math.min(digitsBeforeCaret, digits.length)) {
      if (/\d/.test(formatted[pos])) {
        seen++;
      }
      pos++;
    }
    el.setSelectionRange?.(pos, pos);
  }
}
