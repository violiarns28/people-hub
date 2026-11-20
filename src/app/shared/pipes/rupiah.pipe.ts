import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a number as Indonesian rupiah, e.g. `5000000` -> `Rp. 5.000.000,00`.
 * Uses the built-in Intl API, so it needs no extra dependency.
 */
@Pipe({ name: 'rupiah' })
export class RupiahPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  transform(value: number | null | undefined): string {
    const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return `Rp. ${this.formatter.format(amount)}`;
  }
}
