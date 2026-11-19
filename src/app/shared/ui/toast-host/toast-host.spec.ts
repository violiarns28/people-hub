import { TestBed } from '@angular/core/testing';
import { ToastService } from '../../../core/ui/toast.service';
import { ToastHost } from './toast-host';

describe('ToastHost', () => {
  function setup() {
    const fixture = TestBed.createComponent(ToastHost);
    fixture.detectChanges();
    return {
      fixture,
      el: fixture.nativeElement as HTMLElement,
      toasts: TestBed.inject(ToastService),
    };
  }

  it('is a polite live region', () => {
    const { el } = setup();
    expect(el.getAttribute('aria-live')).toBe('polite');
    expect(el.getAttribute('role')).toBe('status');
  });

  it('renders toasts with variant hooks', () => {
    const { fixture, el, toasts } = setup();
    toasts.show('Careful', 'warning');
    toasts.show('Failed', 'danger');
    fixture.detectChanges();

    expect(el.querySelector('.toast-warning')?.textContent).toContain('Careful');
    expect(el.querySelector('.toast-danger')?.textContent).toContain('Failed');
  });

  it('dismisses through the close button', () => {
    const { fixture, el, toasts } = setup();
    toasts.show('Saved', 'success');
    fixture.detectChanges();

    (el.querySelector('button[aria-label="Dismiss notification"]') as HTMLButtonElement).click();
    expect(toasts.toasts().length).toBe(0);
  });

  it('uses only the reduced palette', () => {
    const { fixture, el, toasts } = setup();
    toasts.show('Saved', 'success');
    toasts.show('Note', 'info');
    fixture.detectChanges();

    const html = el.innerHTML;
    expect(html).not.toMatch(/info-soft|ok-soft|text-info|text-ok/);
    expect(html).toContain('rounded-lg');
  });

  it('lays out icon, message and close button on one centred flex row', () => {
    const { fixture, el, toasts } = setup();
    toasts.show('Saved', 'success');
    fixture.detectChanges();

    const row = el.querySelector('.toast-row') as HTMLElement;
    expect(row.classList).toContain('flex');
    expect(row.classList).toContain('items-center');
    expect(row.children.length).toBe(4);
    expect(row.children[0].classList).toContain('size-5');
    expect(row.children[1].classList).toContain('text-sm/5');
    expect(row.children[2].getAttribute('aria-label')).toBe('Dismiss notification');
  });

  it('draws the accent bar with an inset shadow instead of a border', () => {
    const { fixture, el, toasts } = setup();
    toasts.show('Careful', 'warning');
    fixture.detectChanges();

    const row = el.querySelector('.toast-row') as HTMLElement;
    expect(row.className).toContain('shadow-[inset_4px_0_0_var(--c-warn)');
    expect(row.className).not.toContain('border-l-4');
  });

  it('ends each toast with a decorative countdown progress bar', () => {
    const { fixture, el, toasts } = setup();
    toasts.show('Saved', 'success');
    fixture.detectChanges();

    const row = el.querySelector('.toast-row') as HTMLElement;
    const bar = row.lastElementChild as HTMLElement;
    expect(bar.classList).toContain('toast-progress');
    expect(bar.getAttribute('aria-hidden')).toBe('true');
    expect(row.classList).toContain('overflow-hidden');
  });

  it('keeps one width and offset rule per breakpoint', () => {
    const { el } = setup();
    expect(el.className).toContain('md:right-4');
    expect(el.className).toContain('md:w-96');
    expect(el.className).toContain('top-4');
    expect(el.className).toContain('w-[calc(100%-2rem)]');
    expect(el.className).toContain('max-w-sm');
  });
});
