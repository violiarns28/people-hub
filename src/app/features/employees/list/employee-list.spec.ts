import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { EmployeeService } from '../../../core/employees/employee.service';
import { ToastService } from '../../../core/ui/toast.service';
import { EmployeeList } from './employee-list';

describe('EmployeeList', () => {
  let fixture: ComponentFixture<EmployeeList>;
  let router: Router;
  let toast: ToastService;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [EmployeeList],
      providers: [provideRouter([])],
    }).compileComponents();

    router = TestBed.inject(Router);
    navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    toast = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(EmployeeList);
    fixture.detectChanges();
  });

  const el = (): HTMLElement => fixture.nativeElement;
  const rows = (): HTMLElement[] => Array.from(el().querySelectorAll('tbody tr'));
  const set = (inputs: Record<string, unknown>): void => {
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
  };
  const lastParams = (): Record<string, unknown> =>
    (navigate.mock.calls.at(-1)?.[1] as { queryParams: Record<string, unknown> }).queryParams;

  const option = (label: string): HTMLElement =>
    Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (o) => o.textContent?.trim() === label,
    )!;
  const choose = (triggerId: string, label: string): void => {
    (el().querySelector(`#${triggerId}`) as HTMLButtonElement).click();
    fixture.detectChanges();
    option(label).click();
    fixture.detectChanges();
  };
  const header = (label: string): HTMLButtonElement =>
    Array.from(el().querySelectorAll('th button')).find((b) =>
      b.textContent?.includes(label),
    ) as HTMLButtonElement;

  it('renders 10 rows, a count and a compact toolbar without chips or stat cards', () => {
    expect(rows()).toHaveLength(10);
    expect(el().querySelector('[data-testid="count"]')?.textContent?.trim()).toBe('100 employees');
    expect(el().querySelector('dl')).toBeNull();
    expect(el().querySelector('select')).toBeNull();
    expect(el().querySelector('[aria-label="Active filters"]')).toBeNull();
    expect(el().querySelector('[aria-label="Clear filters"]')!.classList).toContain('invisible');
    expect(el().querySelector('#search')).not.toBeNull();
    expect(el().textContent).not.toContain('Hides again after');
  });

  it('applies group AND status filters', () => {
    set({ group: 'Engineering', status: 'Permanent' });
    const all = TestBed.inject(EmployeeService).employees();
    const expected = all.filter((e) => e.group === 'Engineering' && e.status === 'Permanent');
    expect(el().querySelector('[data-testid="count"]')?.textContent?.trim()).toBe(
      `${expected.length} of ${all.length} employees`,
    );
    for (const r of rows()) {
      expect(r.textContent).toContain('Engineering');
      expect(r.textContent).toContain('Permanent');
    }
  });

  it('sorts by column and exposes aria-sort', () => {
    set({ sort: 'basicSalary', dir: 'desc' });
    const th = Array.from(el().querySelectorAll('th')).find((t) =>
      t.textContent?.includes('Basic salary'),
    );
    expect(th?.getAttribute('aria-sort')).toBe('descending');
    const max = Math.max(
      ...TestBed.inject(EmployeeService)
        .employees()
        .map((e) => e.basicSalary),
    );
    const top = TestBed.inject(EmployeeService)
      .employees()
      .find((e) => e.basicSalary === max)!;
    expect(rows()[0].textContent).toContain(top.username);
  });

  it('cycles header sort asc, desc, then clears the params', () => {
    header('Group').click();
    expect(lastParams()).toMatchObject({ sort: 'group', dir: 'asc', page: null });
    set({ sort: 'group', dir: 'asc' });
    header('Group').click();
    expect(lastParams()).toMatchObject({ sort: 'group', dir: 'desc', page: null });
    set({ sort: 'group', dir: 'desc' });
    header('Group').click();
    expect(lastParams()).toMatchObject({ sort: null, dir: null, page: null });
  });

  it('keeps service order with no sort and shows neutral aria-sort', () => {
    set({ sort: undefined, dir: undefined });
    const all = TestBed.inject(EmployeeService).employees();
    expect(rows()[0].textContent).toContain(all[0].username);
    for (const th of Array.from(el().querySelectorAll('th[aria-sort]'))) {
      expect(th.getAttribute('aria-sort')).toBe('none');
    }
  });

  it('mobile sort select and direction button use the same three states', () => {
    choose('sortBy', 'Group');
    expect(lastParams()).toMatchObject({ sort: 'group', dir: 'asc', page: null });
    set({ sort: 'group', dir: 'asc' });
    const dirBtn = el().querySelector(
      'button[aria-label^="Sorted ascending"]',
    ) as HTMLButtonElement;
    dirBtn.click();
    expect(lastParams()).toMatchObject({ sort: 'group', dir: 'desc' });
    set({ sort: 'group', dir: 'desc' });
    (el().querySelector('button[aria-label^="Sorted descending"]') as HTMLButtonElement).click();
    expect(lastParams()).toMatchObject({ sort: null, dir: null });
    choose('sortBy', 'Default order');
    expect(lastParams()).toMatchObject({ sort: null, dir: null });
  });

  it('paginates and honours page size', () => {
    set({ page: 2 });
    expect(rows()).toHaveLength(10);
    set({ size: 5, page: 1 });
    expect(rows()).toHaveLength(5);
    set({ size: 100 });
    expect(rows()).toHaveLength(100);
  });

  it('debounces search by 300ms', () => {
    vi.useFakeTimers();
    try {
      const input = el().querySelector('#search') as HTMLInputElement;
      input.value = 'citra';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(299);
      expect(navigate).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(lastParams()).toMatchObject({ q: 'citra', page: null });
    } finally {
      vi.useRealTimers();
    }
  });

  it('writes group and status to the URL', () => {
    choose('groupFilter', 'Design');
    expect(lastParams()).toMatchObject({ group: 'Design', page: null });
    choose('statusFilter', 'Intern');
    expect(lastParams()).toMatchObject({ status: 'Intern', page: null });
    set({ group: 'Design' });
    choose('groupFilter', 'All groups');
    expect(lastParams()).toMatchObject({ group: null });
  });

  it('reserves Clear space (invisible, disabled) without filters and clears q, group and status', () => {
    const clear = () => el().querySelector('[aria-label="Clear filters"]') as HTMLButtonElement;
    expect(clear().classList).toContain('invisible');
    expect(clear().disabled).toBe(true);
    set({ q: 'a', group: 'Design' });
    expect(clear().classList).not.toContain('invisible');
    expect(clear().disabled).toBe(false);
    clear().click();
    expect(lastParams()).toMatchObject({ q: null, group: null, status: null, page: null });
  });

  it('keeps toolbar controls at fixed widths so filter values never shift them', () => {
    const wrap = (id: string) =>
      el().querySelector(`#${id}`)!.closest('div.min-w-0') as HTMLElement;
    expect(wrap('groupFilter').className).toContain('sm:w-48');
    expect(wrap('groupFilter').className).toContain('sm:flex-none');
    expect(wrap('statusFilter').className).toContain('sm:w-40');
    expect(wrap('statusFilter').className).toContain('sm:flex-none');
    expect(el().querySelector('#groupFilter span.truncate')).not.toBeNull();
    expect(el().querySelector('button[role="switch"]')!.className).toContain('shrink-0');
  });

  it('shows a clear search button only when there is text and clears the query', () => {
    expect(el().querySelector('[aria-label="Clear search"]')).toBeNull();
    const input = el().querySelector('#search') as HTMLInputElement;
    input.value = 'abc';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const btn = el().querySelector('[aria-label="Clear search"]') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
    fixture.detectChanges();
    expect(lastParams()).toMatchObject({ q: null });
    expect(el().querySelector('[aria-label="Clear search"]')).toBeNull();
  });

  it('shows the page header ornament with the users icon', () => {
    expect(el().querySelector('header .bg-brand-soft app-icon')).not.toBeNull();
  });

  it('shows the empty state', () => {
    set({ q: 'no-such-employee-xyz' });
    expect(el().textContent).toContain('No employees match your filters.');
    expect(rows()).toHaveLength(0);
    expect(el().querySelector('app-illustration')).not.toBeNull();
    expect(el().querySelector('button.btn-secondary')?.textContent).toBeDefined();
  });

  const dialogButton = (label: string): HTMLButtonElement =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('dialog button')).find(
      (b) => b.textContent?.trim() === label,
    )!;

  it('navigates to edit and preserves the list query params', () => {
    const row = rows()[0];
    const username = row
      .querySelector('a[aria-label^="Detail"]')!
      .getAttribute('href')!
      .split('/')[2];
    (row.querySelector('button[aria-label^="Edit"]') as HTMLButtonElement).click();
    expect(navigate).toHaveBeenLastCalledWith(['/employees', username, 'edit'], {
      queryParamsHandling: 'preserve',
    });
  });

  it('cancelling the delete dialog changes nothing', () => {
    const show = vi.spyOn(toast, 'show');
    const service = TestBed.inject(EmployeeService);
    const before = service.employees().length;
    (rows()[0].querySelector('button[aria-label^="Delete"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el().querySelector('dialog')?.textContent).toContain('This cannot be undone.');
    dialogButton('Cancel').click();
    fixture.detectChanges();
    expect(service.employees()).toHaveLength(before);
    expect(show).not.toHaveBeenCalled();
  });

  it('confirming delete removes the row and shows a danger toast', () => {
    const show = vi.spyOn(toast, 'show');
    const service = TestBed.inject(EmployeeService);
    const first = service.employees()[0];
    const name = `${first.firstName} ${first.lastName}`;
    (rows()[0].querySelector('button[aria-label^="Delete"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el().querySelector('dialog')?.textContent).toContain(
      `Delete ${name}? This cannot be undone.`,
    );
    dialogButton('Delete').click();
    fixture.detectChanges();
    expect(show).toHaveBeenCalledWith(`Deleted ${name}`, 'danger');
    expect(service.employees().some((e) => e.username === first.username)).toBe(false);
    expect(el().textContent).not.toContain(first.username);
  });

  it('renders a compact mobile card per row with icon actions', () => {
    const cards = Array.from(el().querySelectorAll('[data-testid="employee-card"]'));
    expect(cards).toHaveLength(10);
    const card = cards[0];
    for (const verb of ['Detail', 'Edit', 'Delete']) {
      const control = card.querySelector(`[aria-label^="${verb} "]`) as HTMLElement;
      expect(control.getAttribute('title')).toBe(control.getAttribute('aria-label'));
      expect(control.className).toContain('size-11');
    }
    expect(card.textContent).toContain('Salary');
    expect(card.textContent).toContain('Birth date');
    expect(card.textContent).toMatch(/@\S+/);
    expect(el().querySelector('[data-testid="mobile-list"]')?.className).toContain('md:hidden');
    expect(el().querySelector('.table-wrap')?.className).toContain('max-md:hidden');
  });

  it('keeps real emails out of the DOM while masked', () => {
    const email = TestBed.inject(EmployeeService).employees()[0].email;
    expect(el().innerHTML).not.toContain(email);
    expect(el().innerHTML).not.toContain('@people');
    expect(el().textContent).not.toContain(email);
  });

  it('reveals values with the global switch', () => {
    const sw = el().querySelector('[role="switch"]') as HTMLButtonElement;
    sw.click();
    fixture.detectChanges();
    expect(sw.getAttribute('aria-checked')).toBe('true');
    expect(rows()[0].textContent).toContain(TestBed.inject(EmployeeService).employees()[0].email);
    sw.click();
  });

  it('has icon-only row actions with titles and no eye icon on Detail', () => {
    const row = rows()[0];
    for (const verb of ['Detail', 'Edit', 'Delete']) {
      const control = row.querySelector(`[aria-label^="${verb} "]`) as HTMLElement;
      expect(control.getAttribute('title')).toBe(control.getAttribute('aria-label'));
    }
  });

  it('gives Detail a grey tile like the yellow Edit and red Delete tiles', () => {
    const tones: Record<string, string> = {
      Detail: 'bg-neutral-soft',
      Edit: 'bg-warn-soft',
      Delete: 'bg-bad-soft',
    };
    const containers = [
      rows()[0],
      el().querySelector('[data-testid="employee-card"]') as HTMLElement,
    ];
    for (const container of containers) {
      for (const [verb, tone] of Object.entries(tones)) {
        const control = container.querySelector(`[aria-label^="${verb} "]`) as HTMLElement;
        expect(control.classList).toContain(tone);
      }
    }
  });

  it('masks salary and birth date with the same length as the real format', () => {
    const text = rows()[0].textContent ?? '';
    expect(text).toMatch(/Rp\. [\u2022.]+,\u2022\u2022/);
    expect(text).not.toMatch(/Rp\. \d/);
    expect(text).toContain('\u2022\u2022 \u2022\u2022\u2022 \u2022\u2022\u2022\u2022');
  });

  it('links detail with preserved query params', () => {
    const detail = rows()[0].querySelector('a[aria-label^="Detail"]') as HTMLAnchorElement;
    expect(detail.getAttribute('href')).toMatch(/^\/employees\/.+/);
  });
});
