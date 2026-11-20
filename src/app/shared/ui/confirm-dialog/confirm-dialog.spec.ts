import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog';

@Component({
  imports: [ConfirmDialog],
  template: `
    <app-confirm-dialog
      [(open)]="open"
      title="Delete employee"
      message="This cannot be undone."
      confirmLabel="Delete"
      tone="danger"
      (confirmed)="log.push('confirmed')"
      (cancelled)="log.push('cancelled')"
    />
  `,
})
class Host {
  open = signal(false);
  log: string[] = [];
}

describe('ConfirmDialog', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const dialog = el.querySelector('dialog') as HTMLDialogElement;
    const button = (text: string) =>
      Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === text)!;
    return { fixture, el, dialog, button };
  }

  it('opens when the model becomes true and shows its content', async () => {
    const { fixture, el, dialog } = setup();
    expect(dialog.hasAttribute('open')).toBe(false);

    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialog.hasAttribute('open')).toBe(true);
    expect(el.querySelector('h2')?.textContent).toContain('Delete employee');
    expect(dialog.getAttribute('aria-labelledby')).toBe(el.querySelector('h2')?.id);
    expect(el.textContent).toContain('This cannot be undone.');
  });

  it('uses the scale-in panel and shakes the danger icon once', () => {
    const { el, dialog } = setup();
    expect(dialog.classList).toContain('confirm-panel');
    expect(el.querySelector('.confirm-icon')?.classList).toContain('is-danger');
  });

  it('gives the confirm button press feedback', () => {
    const { button } = setup();
    expect(button('Delete').classList).toContain('press');
  });

  it('confirms and closes', async () => {
    const { fixture, dialog, button } = setup();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    button('Delete').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.log).toEqual(['confirmed']);
    expect(fixture.componentInstance.open()).toBe(false);
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('cancels from the button, Esc and the backdrop', () => {
    const { fixture, dialog, button } = setup();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    button('Cancel').click();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    dialog.click();

    expect(fixture.componentInstance.log).toEqual(['cancelled', 'cancelled', 'cancelled']);
  });
});
