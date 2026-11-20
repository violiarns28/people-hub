import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Pagination } from './pagination';

@Component({
  imports: [Pagination],
  template: `
    <app-pagination
      [page]="page()"
      [pages]="pages()"
      [total]="total()"
      [pageSize]="10"
      [pageSizes]="[10, 25]"
      (pageChange)="changed.push($event)"
      (pageSizeChange)="sizes.push($event)"
    />
  `,
})
class Host {
  page = signal(1);
  pages = signal(10);
  total = signal(100);
  changed: number[] = [];
  sizes: number[] = [];
}

describe('Pagination', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const btn = (label: string) =>
      el.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;
    return { fixture, el, btn };
  }

  it('shows the range summary', () => {
    const { el } = setup();
    expect(el.textContent?.replace(/\s+/g, ' ')).toContain('Showing 1 to 10 of 100');
  });

  it('marks the current page and renders gaps as three dots', () => {
    const { fixture, el } = setup();
    fixture.componentInstance.page.set(5);
    fixture.detectChanges();

    const current = el.querySelector('[aria-current="page"]');
    expect(current?.textContent?.trim()).toBe('5');
    expect(el.textContent).toContain('...');
    expect(el.textContent).not.toContain('\u2026');
  });

  it('disables first/prev on page 1 and emits navigation', () => {
    const { fixture, btn } = setup();
    expect(btn('First page').disabled).toBe(true);
    expect(btn('Previous page').disabled).toBe(true);

    btn('Next page').click();
    btn('Last page').click();
    expect(fixture.componentInstance.changed).toEqual([2, 10]);
  });

  it('emits page size changes from the labelled select', () => {
    const { fixture, el } = setup();
    expect(el.querySelector('label[for="pageSize"]')?.textContent).toContain('Rows per page');
    const trigger = el.querySelector('button#pageSize') as HTMLButtonElement;
    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(el.querySelector('select')).toBeNull();
    trigger.click();
    fixture.detectChanges();
    const opt = Array.from(el.querySelectorAll('[role=option]')).find(
      (o) => o.textContent?.trim() === '25',
    ) as HTMLElement;
    opt.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.sizes).toEqual([25]);
  });

  it('shows zero range when empty', () => {
    const { fixture, el } = setup();
    fixture.componentInstance.total.set(0);
    fixture.componentInstance.pages.set(1);
    fixture.detectChanges();
    expect(el.textContent?.replace(/\s+/g, ' ')).toContain('Showing 0 to 0 of 0');
  });

  it('marks the current page with the pop class and gives buttons press feedback', () => {
    const { el } = setup();
    const current = el.querySelector('[aria-current="page"]') as HTMLElement;
    expect(current.className).toContain('page-active');
    expect(current.className).toContain('active:scale-90');
    expect(el.querySelectorAll('.tick').length).toBe(3);
  });

  it('keeps the page-size select a fixed width', () => {
    const { el } = setup();
    expect(el.querySelector('app-select')!.className).toContain('w-24');
  });
});
