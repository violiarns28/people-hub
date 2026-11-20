import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { CurrencyInput } from './currency-input';

@Component({
  imports: [CurrencyInput, FormField],
  template: `
    <label for="salary">Salary</label>
    <app-currency-input inputId="salary" [formField]="f.amount" />
  `,
})
class Host {
  model = signal({ amount: 0 });
  f = form(this.model);
}

describe('CurrencyInput', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    const type = (text: string) => {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    return { fixture, input, type };
  }

  it('has Rp prefix, numeric keyboard and label association', () => {
    const { fixture, input } = setup();
    expect(input.id).toBe('salary');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Rp');
  });

  it('strips non digits and formats with dots', () => {
    const { fixture, input, type } = setup();
    type('abc5000000x');
    expect(input.value).toBe('5.000.000');
    expect(fixture.componentInstance.model().amount).toBe(5000000);
  });

  it('reformats when separators are retyped', () => {
    const { fixture, input, type } = setup();
    type('1.234.5678');
    expect(input.value).toBe('12.345.678');
    expect(fixture.componentInstance.model().amount).toBe(12345678);
  });

  it('emits 0 when emptied', () => {
    const { fixture, input, type } = setup();
    type('900');
    type('');
    expect(input.value).toBe('');
    expect(fixture.componentInstance.model().amount).toBe(0);
  });

  it('shows externally set values formatted', async () => {
    const { fixture, input } = setup();
    fixture.componentInstance.model.set({ amount: 2500000 });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(input.value).toBe('2.500.000');
  });
});
