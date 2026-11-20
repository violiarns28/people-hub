import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { EmployeeService } from '../../../core/employees/employee.service';
import { unsavedChangesGuard } from '../../../core/employees/unsaved-changes.guard';
import { ToastService } from '../../../core/ui/toast.service';
import { AddEmployee, SAVE_DELAY_MS, SUCCESS_DELAY_MS } from './add-employee';

const VALID = {
  username: 'jane.doe',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@peoplehub.dev',
  birthDate: '1990-05-15',
  basicSalary: 7_500_000,
  status: 'Permanent',
  group: 'Engineering',
  description: 'A new employee',
};

describe('AddEmployee', () => {
  let fixture: ComponentFixture<AddEmployee>;
  let component: AddEmployee;
  let router: Router;
  let employees: EmployeeService;
  let toast: ToastService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AddEmployee],
      providers: [provideRouter([])],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    employees = TestBed.inject(EmployeeService);
    vi.spyOn(employees, 'add');
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'show');

    fixture = TestBed.createComponent(AddEmployee);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  const internals = () => component as any;
  const el = (): HTMLElement => fixture.nativeElement;

  function setModel(overrides: Partial<typeof VALID> = {}): void {
    internals().model.set({ ...VALID, ...overrides });
    fixture.detectChanges();
  }

  async function submit(): Promise<void> {
    vi.useFakeTimers();
    internals().onSubmit(new Event('submit'));
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS + 600);
    vi.useRealTimers();
    fixture.detectChanges();
  }

  const buttons = (): HTMLButtonElement[] => Array.from(el().querySelectorAll('button'));
  const buttonByText = (text: string) => buttons().find((b) => b.textContent?.trim() === text)!;

  it('uses the exact labels', () => {
    const labels = Array.from(el().querySelectorAll('label')).map((l) => l.textContent?.trim());

    for (const expected of [
      'Username',
      'Email',
      'First name',
      'Last name',
      'Birth date',
      'Basic salary (IDR)',
      'Status',
      'Group',
      'Description',
    ]) {
      expect(labels).toContain(expected);
    }
    expect(buttonByText('Save employee')).toBeTruthy();
    expect(buttonByText('Cancel')).toBeTruthy();
  });

  it('uses custom selects with a searchable group and no native select', () => {
    expect(el().querySelector('select')).toBeNull();
    const status = el().querySelector('button#status') as HTMLElement;
    const group = el().querySelector('button#group') as HTMLElement;
    expect(status.getAttribute('role')).toBe('combobox');
    expect(status.textContent).toContain('Select a status');
    expect(group.textContent).toContain('Select a group');
    group.click();
    fixture.detectChanges();
    expect(el().querySelector('input[type=text]')).not.toBeNull();
    expect(el().querySelectorAll('[role=option]').length).toBe(10);
  });

  it('marks save as unavailable while the form is invalid', () => {
    expect(buttonByText('Save employee').getAttribute('aria-disabled')).toBe('true');
    setModel();
    expect(buttonByText('Save employee').getAttribute('aria-disabled')).toBeNull();
  });

  it('shows required errors and a summary when submitted empty', async () => {
    await submit();

    expect(employees.add).not.toHaveBeenCalled();
    const text = el().textContent;
    expect(text).toContain('Username is required');
    expect(text).toContain('First name is required');
    expect(text).toContain('Last name is required');
    expect(text).toContain('Email is required');
    expect(text).toContain('Birth date is required');
    expect(text).toContain('Basic salary must be greater than 0');
    expect(text).toContain('Status is required');
    expect(text).toContain('Group is required');
    expect(text).toContain('Description is required');
    expect(el().querySelector('[role="alert"]')).not.toBeNull();
    expect(el().querySelector('#username')?.getAttribute('aria-invalid')).toBe('true');
    expect(el().querySelector('#username')?.getAttribute('aria-describedby')).toBe(
      'username-error',
    );
  });

  it('focuses the first invalid field on a failed submit', async () => {
    document.body.appendChild(el());
    await submit();

    expect(document.activeElement?.id).toBe('username');
    el().remove();
  });

  it('does not show errors before a field is touched', () => {
    expect(el().textContent).not.toContain('Username is required');
  });

  it('enables saving when every field is valid', () => {
    setModel();

    expect(internals().employeeForm().valid()).toBe(true);
  });

  it('rejects an invalid email', async () => {
    setModel({ email: 'not-an-email' });

    await submit();

    expect(employees.add).not.toHaveBeenCalled();
    expect(el().textContent).toContain('Enter a valid email address');
  });

  it('rejects a future birth date', async () => {
    setModel({ birthDate: '2999-01-01' });

    await submit();

    expect(employees.add).not.toHaveBeenCalled();
    expect(el().textContent).toContain('Birth date cannot be in the future');
  });

  it('caps the birth date at today as yyyy-MM-dd and uses the custom picker', () => {
    expect(internals().maxBirthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(el().querySelector('app-date-picker')).not.toBeNull();
    expect(el().querySelector('input[type=datetime-local]')).toBeNull();
  });

  it('accepts today as a birth date', () => {
    setModel({ birthDate: internals().maxBirthDate });

    expect(internals().employeeForm.birthDate().valid()).toBe(true);
  });

  it.each([0, -5, Number.NaN])('rejects a non-positive salary (%s)', async (basicSalary) => {
    setModel({ basicSalary });

    await submit();

    expect(employees.add).not.toHaveBeenCalled();
    expect(el().textContent).toContain('Basic salary must be greater than 0');
  });

  it('accepts a numeric salary of 1', () => {
    setModel({ basicSalary: 1 });

    expect(internals().employeeForm.basicSalary().valid()).toBe(true);
  });

  it('rejects a username that is already taken, ignoring case', async () => {
    setModel({ username: 'ANDI.SANTOSO1' });

    await submit();

    expect(employees.add).not.toHaveBeenCalled();
    expect(el().textContent).toContain('Username is already taken');
  });

  it('rejects a description over the limit', () => {
    setModel({ description: 'x'.repeat(281) });

    expect(internals().employeeForm.description().valid()).toBe(false);
  });

  it('shows a live description counter', () => {
    setModel({ description: 'hello' });

    expect(el().textContent).toContain('5/280');
  });

  it('shows the loading state while saving', async () => {
    setModel();
    vi.useFakeTimers();
    internals().onSubmit(new Event('submit'));
    await vi.advanceTimersByTimeAsync(10);
    fixture.detectChanges();

    expect(internals().saving()).toBe(true);
    expect(buttons().some((b) => b.textContent?.includes('Saving'))).toBe(true);

    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS + 100);
    vi.useRealTimers();
    fixture.detectChanges();
    expect(internals().saving()).toBe(false);
  });

  it('saves a valid employee, notifies, and returns to the list', async () => {
    setModel();
    expect(component.hasUnsavedChanges()).toBe(true);

    await submit();

    expect(employees.add).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'jane.doe',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@peoplehub.dev',
        basicSalary: 7_500_000,
        status: 'Permanent',
        group: 'Engineering',
      }),
    );
    expect(toast.show).toHaveBeenCalledWith('Employee Jane Doe added', 'success');
    expect(router.navigate).toHaveBeenCalledWith(['/employees']);
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('keeps birth date in Identity and salary alone in Compensation', () => {
    const section = (id: string) => el().querySelector(`section[aria-labelledby="sec-${id}"]`)!;
    expect(section('identity').querySelector('#birthDate')).not.toBeNull();
    expect(section('compensation').querySelector('#birthDate')).toBeNull();
    expect(section('compensation').querySelector('#basicSalary')).not.toBeNull();
    expect(section('employment').querySelector('#status')).not.toBeNull();
    expect(section('employment').querySelector('#group')).not.toBeNull();
  });

  it('orders sections Identity, Employment, Compensation, Notes with icon tiles', () => {
    const titles = Array.from(el().querySelectorAll('section h2')).map((h) =>
      h.textContent?.trim(),
    );
    expect(titles).toEqual(['Identity', 'Employment', 'Compensation', 'Notes']);
    expect(
      el().querySelectorAll('section h2 + span, section > div > span app-icon').length,
    ).toBeGreaterThan(3);
  });

  it('orders identity fields username, email, first, last, birth date', () => {
    const ids = Array.from(
      el().querySelectorAll('section[aria-labelledby="sec-identity"] label'),
    ).map((l) => l.getAttribute('for'));
    expect(ids).toEqual(['username', 'email', 'firstName', 'lastName', 'birthDate']);
  });

  it('focuses the first invalid field in new DOM order', async () => {
    document.body.appendChild(el());
    setModel({ username: 'jane.doe', email: '', firstName: '' });
    await submit();
    expect(document.activeElement?.id).toBe('email');
    el().remove();
  });

  it('ticks the rail checklist live as fields become valid', () => {
    expect(internals().total().done).toBe(0);
    expect(internals().total().total).toBe(9);
    internals().model.set({
      username: 'jane.doe',
      firstName: 'Jane',
      lastName: '',
      email: '',
      birthDate: '',
      basicSalary: 0,
      status: '',
      group: '',
      description: '',
    });
    fixture.detectChanges();
    expect(internals().sec().identity.done).toBe(2);
    expect(internals().total().done).toBe(2);
    expect(el().querySelectorAll('.check-row.ok').length).toBe(2);
    expect(el().querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('2');
    setModel();
    expect(internals().total().done).toBe(9);
    expect(internals().sec().identity.complete).toBe(true);
  });

  it('warns on the counter near the limit', () => {
    setModel({ description: 'x'.repeat(260) });
    expect(el().querySelector('.count')?.classList.contains('warn')).toBe(true);
    setModel({ description: 'x' });
    expect(el().querySelector('.count')?.classList.contains('warn')).toBe(false);
  });

  it('shows a success state before navigating', async () => {
    setModel();
    vi.useFakeTimers();
    internals().onSubmit(new Event('submit'));
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS + 10);
    fixture.detectChanges();
    expect(internals().succeeded()).toBe(true);
    expect(buttons().some((b) => b.textContent?.includes('Saved'))).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(SUCCESS_DELAY_MS + 10);
    expect(router.navigate).toHaveBeenCalledWith(['/employees']);
  });

  it('cancels back to the list', () => {
    buttonByText('Cancel').click();

    expect(router.navigate).toHaveBeenCalledWith(['/employees']);
  });

  describe('unsaved changes', () => {
    const runGuard = () =>
      unsavedChangesGuard(component, {} as never, {} as never, {} as never) as
        boolean | Promise<boolean>;

    it('lets a pristine form leave without asking', () => {
      expect(component.hasUnsavedChanges()).toBe(false);
      expect(runGuard()).toBe(true);
    });

    it('asks to discard a dirty form and stays when cancelled', async () => {
      setModel({ firstName: 'Jane' });
      expect(component.hasUnsavedChanges()).toBe(true);

      const pending = runGuard();
      fixture.detectChanges();
      expect(internals().leaveOpen()).toBe(true);

      internals().onLeaveCancelled();
      await expect(pending).resolves.toBe(false);
      expect(internals().leaveOpen()).toBe(false);
    });

    it('leaves when the discard is confirmed', async () => {
      setModel({ firstName: 'Jane' });

      const pending = runGuard();
      internals().onLeaveConfirmed();

      await expect(pending).resolves.toBe(true);
    });

    it('treats dismissing the dialog as staying', async () => {
      setModel({ firstName: 'Jane' });

      const pending = component.confirmLeave();
      internals().onLeaveOpenChange(false);

      await expect(pending).resolves.toBe(false);
    });
  });
});

describe('AddEmployee in edit mode', () => {
  let fixture: ComponentFixture<AddEmployee>;
  let router: Router;
  let employees: EmployeeService;
  let toast: ToastService;

  const internals = () => fixture.componentInstance as any;
  const el = (): HTMLElement => fixture.nativeElement;
  const buttons = (): HTMLButtonElement[] => Array.from(el().querySelectorAll('button'));
  const buttonByText = (text: string) => buttons().find((b) => b.textContent?.trim() === text)!;

  function open(username: string): void {
    fixture.componentRef.setInput('username', username);
    fixture.detectChanges();
  }

  async function submit(): Promise<void> {
    vi.useFakeTimers();
    internals().onSubmit(new Event('submit'));
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS + 600);
    vi.useRealTimers();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AddEmployee],
      providers: [provideRouter([])],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    employees = TestBed.inject(EmployeeService);
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'show');
    fixture = TestBed.createComponent(AddEmployee);
  });

  afterEach(() => vi.useRealTimers());

  it('prefills the form and shows edit wording', () => {
    open('andi.santoso1');

    expect(el().querySelector('h1')?.textContent).toContain('Edit employee');
    expect(buttonByText('Save changes')).toBeTruthy();
    expect(internals().model().firstName).toBe('Andi');
    expect(internals().model().birthDate).toBe('1965-01-01');
    expect((el().querySelector('#firstName') as HTMLInputElement).value).toBe('Andi');
  });

  it('makes the username read-only without a uniqueness error', () => {
    open('andi.santoso1');

    const input = el().querySelector('#username') as HTMLInputElement;
    expect(input.hasAttribute('readonly')).toBe(true);
    expect(input.getAttribute('aria-readonly')).toBe('true');
    expect(internals().employeeForm.username().valid()).toBe(true);
  });

  it('is pristine until something changes', () => {
    open('andi.santoso1');

    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    internals().model.update((m: object) => ({ ...m, firstName: 'Changed' }));
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
  });

  it('updates, shows a warning toast and keeps the list query params', async () => {
    vi.spyOn(employees, 'update');
    open('andi.santoso1');
    internals().model.update((m: object) => ({ ...m, firstName: 'Andika' }));
    fixture.detectChanges();

    await submit();

    expect(employees.update).toHaveBeenCalledWith(
      'andi.santoso1',
      expect.objectContaining({ firstName: 'Andika' }),
    );
    expect(employees.getByUsername('andi.santoso1')?.firstName).toBe('Andika');
    expect(toast.show).toHaveBeenCalledWith('Updated Andika Santoso', 'warning');
    expect(router.navigate).toHaveBeenCalledWith(['/employees'], {
      queryParamsHandling: 'preserve',
    });
  });

  it('cancels back to the list preserving params', () => {
    open('andi.santoso1');

    buttonByText('Cancel').click();

    expect(router.navigate).toHaveBeenCalledWith(['/employees'], {
      queryParamsHandling: 'preserve',
    });
  });

  it('shows a not-found state for an unknown username', () => {
    open('nobody.here');

    expect(el().textContent).toContain('Employee not found');
    expect(el().querySelector('form')).toBeNull();

    buttonByText('Back to list').click();

    expect(router.navigate).toHaveBeenCalledWith(['/employees'], {
      queryParamsHandling: 'preserve',
    });
  });
});
