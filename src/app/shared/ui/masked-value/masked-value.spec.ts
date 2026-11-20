import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PrivacyService } from '../../../core/privacy/privacy.service';
import { MaskedValue } from './masked-value';

@Component({
  imports: [MaskedValue],
  template: `
    <app-masked-value subject="jane" field="email" value="jane.doe@peoplehub.dev" />
    <app-masked-value id="sal" subject="jane" field="basicSalary" value="Rp. 4.700.000,00" />
    <app-masked-value id="m1" subject="jane" field="email" value="a@b.co" />
    <app-masked-value id="m2" subject="jane" field="email" value="jane.doe@peoplehub.dev" />
    <app-masked-value id="age" subject="jane" field="birthDate" value="35 years" label="age" />
    <app-masked-value id="sal2" subject="jane" field="basicSalary" value="Rp. 15.000.000,00" />
  `,
})
class Host {}

describe('MaskedValue', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector('button') as HTMLButtonElement;
    return { fixture, el, button, privacy: TestBed.inject(PrivacyService) };
  }

  it('keeps the real value out of the DOM while masked', () => {
    const { el, button } = setup();
    expect(el.textContent).not.toContain('jane.doe');
    expect(el.textContent).toContain('j');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Show email');
  });

  it('reveals and hides through the privacy service', () => {
    const { fixture, el, button } = setup();

    button.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('jane.doe@peoplehub.dev');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Hide email');

    button.click();
    fixture.detectChanges();
    expect(el.textContent).not.toContain('jane.doe');
  });

  it('mask and value have the same length and no fixed width', () => {
    const { fixture, el, privacy } = setup();
    const box = (id: string) => el.querySelector(`#${id} .num`) as HTMLElement;
    expect(box('sal').textContent).toBe(
      'Rp. \u2022.\u2022\u2022\u2022.\u2022\u2022\u2022,\u2022\u2022',
    );
    expect(box('sal').style.width).toBe('');
    expect(box('sal').className).not.toContain('overflow-hidden');
    expect(el.textContent).not.toContain('4.700');
    privacy.toggle('jane', 'basicSalary');
    fixture.detectChanges();
    expect(box('sal').textContent).toBe('Rp. 4.700.000,00');
    expect(box('sal2').textContent).toHaveLength('Rp. 15.000.000,00'.length);
    privacy.clear();
  });

  it('email mask length equals the value length for different emails', () => {
    const { fixture, el, privacy } = setup();
    const mail = (id: string) => el.querySelector(`#${id} .num`) as HTMLElement;
    for (const [id, value] of [
      ['m1', 'a@b.co'],
      ['m2', 'jane.doe@peoplehub.dev'],
    ]) {
      expect(mail(id).textContent).toHaveLength(value.length);
    }
    privacy.toggle('jane', 'email');
    fixture.detectChanges();
    expect(mail('m1').textContent).toBe('a@b.co');
    expect(mail('m2').textContent).toBe('jane.doe@peoplehub.dev');
    privacy.clear();
  });

  it('label input overrides the aria-label word', () => {
    const { el } = setup();
    const b = el.querySelector('#age button') as HTMLButtonElement;
    expect(b.getAttribute('aria-label')).toBe('Show age');
  });

  it('reflects reveals triggered elsewhere', () => {
    const { fixture, el, privacy } = setup();
    privacy.toggle('jane', 'email');
    fixture.detectChanges();
    expect(el.textContent).toContain('jane.doe@peoplehub.dev');
    privacy.clear();
  });
});
