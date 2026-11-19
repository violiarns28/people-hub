import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { Select, type SelectOption } from './select';

const OPTS: SelectOption[] = [
  { value: '', label: 'All groups' },
  { value: 'eng', label: 'Engineering' },
  { value: 'fin', label: 'Finance' },
  { value: 'mkt', label: 'Marketing' },
];

@Component({
  imports: [Select, FormField],
  template: `
    <label for="s1">Group</label>
    <app-select
      inputId="s1"
      [options]="opts"
      [searchable]="searchable()"
      [clearable]="clearable()"
      [emphasize]="emphasize()"
      [direction]="direction()"
      [formField]="f.group"
    />
    <button id="outside" type="button">outside</button>
  `,
})
class Host {
  opts = OPTS;
  searchable = signal(false);
  clearable = signal(false);
  emphasize = signal(false);
  direction = signal<'auto' | 'up' | 'down'>('auto');
  model = signal({ group: '' });
  f = form(this.model);
}

@Component({
  imports: [Select],
  template: `<app-select [options]="opts" [value]="v()" (valueChange)="v.set($event)" />`,
})
class Standalone {
  opts = OPTS;
  v = signal('fin');
}

describe('Select', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const trigger = el.querySelector('button[role=combobox]') as HTMLButtonElement;
    const flush = async () => {
      await Promise.resolve();
      fixture.detectChanges();
      await fixture.whenStable();
    };
    const key = (target: Element, k: string) => {
      target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      fixture.detectChanges();
    };
    return { fixture, host: fixture.componentInstance, el, trigger, flush, key };
  }
  const opts = (el: HTMLElement) => Array.from(el.querySelectorAll('[role=option]'));
  const search = (el: HTMLElement) => el.querySelector('input[type=text]') as HTMLInputElement;

  it('wires the label, aria attributes and opens and closes', async () => {
    const { fixture, el, trigger, flush } = await setup();
    expect(trigger.id).toBe('s1');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.textContent).toContain('All groups');

    trigger.click();
    await flush();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBeTruthy();
    expect(opts(el).length).toBe(4);
    expect(search(el)).toBeNull();

    trigger.click();
    fixture.detectChanges();
    expect(opts(el).length).toBe(0);
  });

  it('selects by click, sets the model and shows the label', async () => {
    const { fixture, host, el, trigger, flush } = await setup();
    trigger.click();
    await flush();
    (opts(el)[2] as HTMLElement).click();
    fixture.detectChanges();
    expect(host.model().group).toBe('fin');
    expect(trigger.textContent).toContain('Finance');
    expect(document.activeElement).toBe(trigger);
  });

  it('treats an empty value option as a normal option', async () => {
    const { fixture, host, el, trigger, flush } = await setup();
    host.model.set({ group: 'eng' });
    fixture.detectChanges();
    trigger.click();
    await flush();
    (opts(el)[0] as HTMLElement).click();
    fixture.detectChanges();
    expect(host.model().group).toBe('');
    expect(trigger.textContent).toContain('All groups');
  });

  it('supports keyboard open, move, select and Escape refocus', async () => {
    const { fixture, host, el, trigger, key } = await setup();
    trigger.focus();
    key(trigger, 'ArrowDown');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    key(trigger, 'ArrowDown');
    key(trigger, 'End');
    expect(trigger.getAttribute('aria-activedescendant')).toBe(opts(el)[3].id);
    key(trigger, 'Home');
    key(trigger, 'ArrowDown');
    key(trigger, 'Enter');
    expect(host.model().group).toBe('eng');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    key(trigger, 'Enter');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    key(trigger, 'Escape');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);

    key(trigger, ' ');
    key(trigger, 'Tab');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fixture.detectChanges();
  });

  it('jumps by type-ahead on the trigger and resets after 600ms', async () => {
    vi.useFakeTimers();
    try {
      const { host, el, trigger, key } = await setup();
      trigger.focus();
      key(trigger, 'm');
      expect(trigger.getAttribute('aria-activedescendant')).toBe(opts(el)[3].id);
      key(trigger, 'e');
      expect(trigger.getAttribute('aria-activedescendant')).toBe(opts(el)[3].id);
      vi.advanceTimersByTime(700);
      key(trigger, 'f');
      key(trigger, 'Enter');
      expect(host.model().group).toBe('fin');
    } finally {
      vi.useRealTimers();
    }
  });

  it('filters when searchable and focuses the search box after render', async () => {
    const { fixture, host, el, trigger, flush, key } = await setup();
    host.searchable.set(true);
    fixture.detectChanges();
    trigger.click();
    await flush();
    const box = search(el);
    expect(document.activeElement).toBe(box);
    box.value = 'fin';
    box.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(opts(el).map((o) => o.textContent?.trim())).toEqual(['Finance']);
    key(box, 'Enter');
    expect(host.model().group).toBe('fin');

    trigger.click();
    await flush();
    const box2 = search(el);
    box2.value = 'zzz';
    box2.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el.textContent).toContain('No results');
  });

  it('closes on outside click and marks touched', async () => {
    const { fixture, host, el, trigger, flush } = await setup();
    trigger.click();
    await flush();
    (el.querySelector('#outside') as HTMLElement).click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(host.f.group().touched()).toBe(true);
  });

  it('marks aria-selected on the chosen option', async () => {
    const { fixture, host, el, trigger, flush } = await setup();
    host.model.set({ group: 'mkt' });
    fixture.detectChanges();
    trigger.click();
    await flush();
    expect(opts(el).map((o) => o.getAttribute('aria-selected'))).toEqual([
      'false',
      'false',
      'false',
      'true',
    ]);
  });

  it('sets data-active only when emphasize and a value is chosen', async () => {
    const { fixture, host, trigger } = await setup();
    host.emphasize.set(true);
    fixture.detectChanges();
    expect(trigger.getAttribute('data-active')).toBeNull();
    host.model.set({ group: 'eng' });
    fixture.detectChanges();
    expect(trigger.getAttribute('data-active')).toBe('true');
    host.emphasize.set(false);
    fixture.detectChanges();
    expect(trigger.getAttribute('data-active')).toBeNull();
  });

  it('clears with the x button when clearable', async () => {
    const { fixture, host, el } = await setup();
    host.model.set({ group: 'eng' });
    fixture.detectChanges();
    expect(el.querySelector('button[aria-label="Clear selection"]')).toBeNull();
    host.clearable.set(true);
    fixture.detectChanges();
    (el.querySelector('button[aria-label="Clear selection"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(host.model().group).toBe('');
  });

  it('opens upward when direction is up', async () => {
    const { fixture, host, el, trigger, flush } = await setup();
    host.direction.set('up');
    fixture.detectChanges();
    trigger.click();
    await flush();
    expect(el.querySelector('.pop-enter')?.classList.contains('bottom-full')).toBe(true);
    host.direction.set('down');
  });

  it('works standalone with value and valueChange', () => {
    const fixture = TestBed.createComponent(Standalone);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const trigger = el.querySelector('button[role=combobox]') as HTMLButtonElement;
    expect(trigger.textContent).toContain('Finance');
    trigger.click();
    fixture.detectChanges();
    (el.querySelectorAll('[role=option]')[3] as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.v()).toBe('mkt');
  });

  it('keeps the trigger label truncated and the chevron fixed so width never depends on value', () => {
    const fixture = TestBed.createComponent(Select);
    fixture.componentRef.setInput('options', [{ value: 'a', label: 'A very long label indeed' }]);
    fixture.componentRef.setInput('value', 'a');
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('button[role="combobox"]') as HTMLElement;
    expect(trigger.className).toContain('min-w-0');
    expect(trigger.className).toContain('active:scale-[0.98]');
    const label = trigger.querySelector('span') as HTMLElement;
    expect(label.className).toContain('truncate');
    expect(trigger.querySelector('app-icon')!.className).toContain('shrink-0');
  });

  it('rotates the chevron when open and marks the active option', () => {
    const fixture = TestBed.createComponent(Select);
    fixture.componentRef.setInput('options', [{ value: 'a', label: 'A' }]);
    fixture.componentRef.setInput('value', 'a');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button[role="combobox"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('button[role="combobox"] app-icon')!.className).toContain('rotate-180');
    expect(el.querySelector('[role="option"]')!.getAttribute('data-active')).toBe('true');
    expect(el.querySelector('.check-pop')).not.toBeNull();
  });
});
