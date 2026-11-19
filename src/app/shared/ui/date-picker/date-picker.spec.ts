import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { DatePicker } from './date-picker';
import { todayIso } from './date-utils';

@Component({
  imports: [DatePicker, FormField],
  template: `
    <label for="dob">Date of birth</label>
    @if (bounded()) {
      <app-date-picker
        inputId="dob"
        [min]="min()"
        [max]="max()"
        [value]="model().dob"
        (valueChange)="model.set({ dob: $event })"
      />
    } @else {
      <app-date-picker inputId="dob" [formField]="f.dob" />
    }
    <button id="outside" type="button">outside</button>
  `,
})
class Host {
  bounded = signal(false);
  min = signal('1900-01-01');
  max = signal('2030-12-31');
  model = signal({ dob: '1990-05-15' });
  f = form(this.model);
}

describe('DatePicker', () => {
  async function setup(initial = '1990-05-15') {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.model.set({ dob: initial });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const trigger = el.querySelector('button[role=combobox]') as HTMLButtonElement;
    const flush = async () => {
      await Promise.resolve();
      fixture.detectChanges();
      await fixture.whenStable();
    };
    const key = (target: Element, k: string, init: KeyboardEventInit = {}) => {
      target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));
      fixture.detectChanges();
    };
    const dialog = () => el.querySelector('[role=dialog]') as HTMLElement | null;
    const cell = (iso: string) => el.querySelector(`[data-iso="${iso}"]`) as HTMLButtonElement;
    const byText = (text: string) =>
      Array.from(el.querySelectorAll('[role=dialog] button')).find(
        (b) => b.textContent?.trim() === text,
      ) as HTMLButtonElement;
    const byLabel = (label: string) =>
      el.querySelector(`[role=dialog] [aria-label="${label}"]`) as HTMLButtonElement;
    const title = () =>
      (
        el.querySelector(
          '[role=dialog] button[aria-label*="choose"], [role=dialog] button[aria-label*="back"]',
        ) as HTMLElement
      ).textContent!.trim();
    const open = async () => {
      (el.querySelector('button[role=combobox]') as HTMLButtonElement).click();
      await flush();
    };
    const active = () => document.activeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      trigger,
      flush,
      key,
      dialog,
      cell,
      byText,
      byLabel,
      title,
      open,
      active,
    };
  }

  it('wires label and aria, shows the formatted value and opens and closes', async () => {
    const { fixture, trigger, dialog, open } = await setup();
    expect(trigger.id).toBe('dob');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.textContent).toContain('15 May 1990');
    expect(dialog()).toBeNull();

    await open();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(dialog()!.getAttribute('aria-label')).toBe('Choose date');

    trigger.click();
    fixture.detectChanges();
    expect(dialog()).toBeNull();
  });

  it('shows the placeholder when empty', async () => {
    const { trigger } = await setup('');
    expect(trigger.textContent).toContain('Select date');
  });

  it('renders Monday first weekday headers and marks selected and disabled', async () => {
    const { el, open, cell } = await setup();
    await open();
    const heads = Array.from(el.querySelectorAll('[role=columnheader]')).map((h) =>
      h.textContent!.trim(),
    );
    expect(heads).toEqual(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
    expect(cell('1990-05-15').getAttribute('aria-selected')).toBe('true');
    expect(cell('1990-04-30')).not.toBeNull();
    expect(el.querySelectorAll('[role=gridcell]').length).toBe(42);
    expect(el.querySelectorAll('[role=gridcell][tabindex="0"]').length).toBe(1);
  });

  it('navigates months with the buttons', async () => {
    const { fixture, open, byLabel, title, cell } = await setup();
    await open();
    expect(title()).toBe('May 1990');
    byLabel('Next month').click();
    fixture.detectChanges();
    expect(title()).toContain('June 1990');
    byLabel('Previous month').click();
    byLabel('Previous month').click();
    fixture.detectChanges();
    expect(title()).toContain('April 1990');
    expect(cell('1990-04-15')).not.toBeNull();
  });

  it('slides the view horizontally on change with alternating class names', async () => {
    const { fixture, el, open, byLabel } = await setup();
    await open();
    byLabel('Next month').click();
    fixture.detectChanges();
    const wrap = () => el.querySelector('[role=grid]')!.parentElement as HTMLElement;
    const first = wrap().className;
    expect(first).toMatch(/sl-next-/);
    byLabel('Next month').click();
    fixture.detectChanges();
    expect(wrap().className).toMatch(/sl-next-/);
    expect(wrap().className).not.toBe(first);
    byLabel('Previous month').click();
    fixture.detectChanges();
    expect(wrap().className).toMatch(/sl-prev-/);
  });

  it('gives day cells a hover scale, the selected day a pop and Today/Clear an underline hook', async () => {
    const { fixture, el, open, cell, byText } = await setup();
    await open();
    expect(cell('1990-05-14').className).toContain('hover:scale-[1.06]');
    expect(cell('1990-05-15').className).toContain('day-pop');
    expect(byText('Today').classList).toContain('ul-btn');
    expect(byText('Clear').classList).toContain('ul-btn');
    expect(fixture).toBeTruthy();
    expect(el).toBeTruthy();
  });

  it('picks year, then month, then day', async () => {
    const { fixture, host, open, byLabel, byText, flush, el, trigger } = await setup();
    await open();
    (el.querySelector('[role=dialog] button[aria-label*="choose month"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(el.querySelectorAll('[role=grid] [role=gridcell]').length).toBe(12);
    (byLabel('1990, choose year') as HTMLElement).click();
    fixture.detectChanges();
    expect(el.querySelector('[aria-label="Choose year"]')).not.toBeNull();
    expect(byText('1980')).toBeDefined();
    byLabel('Previous years').click();
    fixture.detectChanges();
    expect(byText('1972')).toBeDefined();
    byText('1975').click();
    fixture.detectChanges();
    expect(el.querySelector('[aria-label="Choose month"]')).not.toBeNull();
    byText('Mar').click();
    await flush();
    expect(el.querySelector('[role=grid][aria-label="March 1975"]')).not.toBeNull();
    (el.querySelector('[data-iso="1975-03-20"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(host.model().dob).toBe('1975-03-20');
    expect(trigger.textContent).toContain('20 Mar 1975');
    expect(document.activeElement).toBe(trigger);
  });

  it('disables days outside min and max', async () => {
    const { fixture, host, open, cell } = await setup();
    host.bounded.set(true);
    host.min.set('1990-05-10');
    host.max.set('1990-05-20');
    fixture.detectChanges();
    await open();
    expect(cell('1990-05-09').getAttribute('aria-disabled')).toBe('true');
    expect(cell('1990-05-10').getAttribute('aria-disabled')).toBeNull();
    expect(cell('1990-05-21').getAttribute('aria-disabled')).toBe('true');
    cell('1990-05-21').click();
    fixture.detectChanges();
    expect(host.model().dob).toBe('1990-05-15');
    expect(cell('1990-05-21')).not.toBeNull();
  });

  it('moves with the keyboard and refocuses the trigger on Escape', async () => {
    const { fixture, host, el, trigger, key, flush, active, dialog } = await setup();
    trigger.focus();
    key(trigger, 'ArrowDown');
    await flush();
    expect(active().getAttribute('data-iso')).toBe('1990-05-15');
    const grid = () => active();
    key(grid(), 'ArrowRight');
    await flush();
    expect(active().getAttribute('data-iso')).toBe('1990-05-16');
    key(grid(), 'ArrowDown');
    await flush();
    expect(active().getAttribute('data-iso')).toBe('1990-05-23');
    key(grid(), 'ArrowLeft');
    key(grid(), 'ArrowUp');
    await flush();
    expect(active().getAttribute('data-iso')).toBe('1990-05-15');
    key(grid(), 'Home');
    await flush();
    expect(active().getAttribute('data-iso')).toBe('1990-05-14');
    key(grid(), 'End');
    await flush();
    expect(active().getAttribute('data-iso')).toBe('1990-05-20');
    key(grid(), 'PageDown');
    await flush();
    expect(active().getAttribute('data-iso')).toBe('1990-06-20');
    key(grid(), 'PageUp');
    key(grid(), 'PageUp');
    await flush();
    expect(active().getAttribute('data-iso')).toBe('1990-04-20');
    key(grid(), 'PageDown', { shiftKey: true });
    await flush();
    expect(active().getAttribute('data-iso')).toBe('1991-04-20');
    key(grid(), 'Enter');
    fixture.detectChanges();
    expect(host.model().dob).toBe('1991-04-20');
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);

    key(trigger, 'Enter');
    await flush();
    expect(dialog()).not.toBeNull();
    key(active(), 'Escape');
    fixture.detectChanges();
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(el.querySelector('[role=dialog]')).toBeNull();
  });

  it('traps Tab inside the dialog', async () => {
    const { open, key, active, byText } = await setup();
    await open();
    const clear = byText('Clear');
    clear.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    clear.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect((active() as HTMLInputElement).tagName).toBe('INPUT');
    const back = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    active().dispatchEvent(back);
    expect(back.defaultPrevented).toBe(true);
    expect(active()).toBe(clear);
    expect(key).toBeDefined();
  });

  it('commits typed valid dates (dd/mm/yyyy and ISO) and rejects invalid ones', async () => {
    const { fixture, host, el, open, key } = await setup();
    await open();
    const input = el.querySelector('[role=dialog] input') as HTMLInputElement;
    const type = (v: string) => {
      input.value = v;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
    };
    type('31/02/1990');
    key(input, 'Enter');
    expect(el.querySelector('[role=dialog] p')?.textContent).toContain('valid date');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(host.model().dob).toBe('1990-05-15');

    type('01/01/2040');
    key(input, 'Enter');
    expect(el.querySelector('[role=dialog] p')?.textContent).toContain('between');

    type('02/03/1980');
    key(input, 'Enter');
    expect(host.model().dob).toBe('1980-03-02');
    expect(el.querySelector('[role=dialog]')).toBeNull();

    await open();
    const input2 = el.querySelector('[role=dialog] input') as HTMLInputElement;
    input2.value = '1985-12-25';
    input2.dispatchEvent(new Event('input', { bubbles: true }));
    key(input2, 'Enter');
    expect(host.model().dob).toBe('1985-12-25');
  });

  it('supports Today and Clear', async () => {
    const { fixture, host, open, byText } = await setup();
    await open();
    byText('Today').click();
    fixture.detectChanges();
    expect(host.model().dob).toBe(todayIso());

    await open();
    byText('Clear').click();
    fixture.detectChanges();
    expect(host.model().dob).toBe('');
  });

  it('disables Today when outside the range', async () => {
    const { fixture, host, open, byText } = await setup();
    host.bounded.set(true);
    host.max.set('1999-01-01');
    fixture.detectChanges();
    await open();
    expect(byText('Today').disabled).toBe(true);
  });

  it('marks touched on close and on outside click', async () => {
    const { fixture, host, open, el } = await setup();
    expect(host.f.dob().touched()).toBe(false);
    await open();
    (el.querySelector('#outside') as HTMLElement).click();
    fixture.detectChanges();
    expect(el.querySelector('[role=dialog]')).toBeNull();
    expect(host.f.dob().touched()).toBe(true);
  });

  it('reflects external model changes', async () => {
    const { fixture, host, trigger } = await setup();
    host.model.set({ dob: '2001-12-01' });
    fixture.detectChanges();
    expect(trigger.textContent).toContain('1 Dec 2001');
  });
});
