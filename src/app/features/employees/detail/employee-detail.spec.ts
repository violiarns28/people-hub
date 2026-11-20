import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuditLogService } from '../../../core/audit/audit-log.service';
import { PrivacyService } from '../../../core/privacy/privacy.service';
import { EmployeeService } from '../../../core/employees/employee.service';
import { ToastService } from '../../../core/ui/toast.service';
import { EmployeeDetail } from './employee-detail';

const USER = 'andi.santoso1';
const EMAIL = 'andi.santoso1@peoplehub.dev';
const SALARY = 'Rp. 4.000.000,00';
const BIRTH = '01 January 1965';

describe('EmployeeDetail', () => {
  let fixture: ComponentFixture<EmployeeDetail>;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [EmployeeDetail],
      providers: [provideRouter([])],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(EmployeeDetail);
  });

  afterEach(() => TestBed.inject(PrivacyService).clear());

  const text = (): string => fixture.nativeElement.textContent;

  function render(username: string): void {
    fixture.componentRef.setInput('username', username);
    fixture.detectChanges();
  }

  const button = (label: string) =>
    (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find(
      (b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label,
    )!;

  it('renders the profile header and plain fields', () => {
    render(USER);

    expect(text()).toContain('Andi Santoso');
    expect(text()).toContain(`@${USER}`);
    expect(text()).toContain('Engineering');
    expect(text()).toContain('Permanent');
    expect(text()).toContain('Reliable team player focused on delivery.');
    expect(fixture.nativeElement.querySelector('.badge')?.className).toContain('badge-permanent');
  });

  it('hides email, salary and birth date until revealed', () => {
    render(USER);

    expect(text()).not.toContain(EMAIL);
    expect(text()).not.toContain(SALARY);
    expect(text()).not.toContain('1965');
    expect(text()).not.toContain('4.000.000');
  });

  it('shows the formatted values with age once revealed', () => {
    render(USER);

    button('Show email').click();
    button('Show salary').click();
    button('Show birth date').click();
    fixture.detectChanges();

    expect(text()).toContain(EMAIL);
    expect(text()).toContain(SALARY);
    expect(text()).toContain(BIRTH);
    expect(text()).not.toContain('09:00');
    expect(text()).toMatch(/\d+ years/);
  });

  it('shares birth date and age privacy state with separate eyes', () => {
    render(USER);

    expect(text()).toContain('Age');
    expect(text()).not.toMatch(/\d+ years/);
    button('Show age').click();
    fixture.detectChanges();

    expect(text()).toContain(BIRTH);
    expect(text()).toMatch(/\d+ years/);
    expect(button('Hide birth date')).toBeTruthy();
    expect(button('Hide age')).toBeTruthy();

    button('Hide birth date').click();
    fixture.detectChanges();
    expect(text()).not.toContain(BIRTH);
    expect(text()).not.toMatch(/\d+ years/);
  });

  it('copies the email only while revealed and announces it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(USER);

    expect(button('Copy email').disabled).toBe(true);
    button('Show email').click();
    fixture.detectChanges();
    expect(button('Copy email').disabled).toBe(false);

    button('Copy email').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith(EMAIL);
    expect(fixture.nativeElement.querySelector('[aria-live="polite"]').textContent).toContain(
      'Copied',
    );
  });

  it('masks a value again after it is hidden', () => {
    render(USER);

    button('Show email').click();
    fixture.detectChanges();
    button('Hide email').click();
    fixture.detectChanges();

    expect(text()).not.toContain(EMAIL);
  });

  it('shows an empty state before anything is revealed', () => {
    render(USER);

    expect(text()).toContain('Recent access');
    expect(text()).toContain('No sensitive fields revealed yet');
  });

  it('lists reveal and hide entries for this employee only', () => {
    const audit = TestBed.inject(AuditLogService);
    audit.record('reveal', 'basicSalary', 'someone.else');
    render(USER);

    button('Show email').click();
    fixture.detectChanges();
    button('Hide email').click();
    fixture.detectChanges();

    expect(text()).toContain('Revealed email');
    expect(text()).toContain('Hid email');
    expect(text()).not.toContain('Revealed salary');
    expect(text()).not.toContain('No sensitive fields revealed yet');
    expect(text()).toContain('just now');
  });

  it('returns to the list preserving query params on OK', () => {
    render(USER);

    button('OK').click();

    expect(router.navigate).toHaveBeenCalledWith(['/employees'], {
      queryParamsHandling: 'preserve',
    });
  });

  it('renders a back link that preserves query params', () => {
    render(USER);

    const link = fixture.nativeElement.querySelector('a[href="/employees"]') as HTMLAnchorElement;
    expect(link).not.toBeNull();
  });

  it('shows a not-found state with a way back', () => {
    render('nobody.here');

    expect(text()).toContain('Employee not found');
    expect(text()).not.toContain('Recent access');

    button('Back to list').click();

    expect(router.navigate).toHaveBeenCalledWith(['/employees'], {
      queryParamsHandling: 'preserve',
    });
  });

  it('links Edit to the edit route preserving query params', () => {
    render(USER);

    const link = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    ).find((a) => a.textContent?.trim() === 'Edit')!;

    expect(link.getAttribute('href')).toBe(`/employees/${USER}/edit`);
  });

  it('opens a danger confirm dialog with the name on Delete', () => {
    render(USER);

    button('Delete').click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.textContent).toContain('Andi Santoso');
    expect(dialog.querySelector('.bg-bad')).not.toBeNull();
  });

  it('removes the employee, shows a red toast and redirects on confirm', () => {
    const toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'show');
    const employees = TestBed.inject(EmployeeService);
    render(USER);

    button('Delete').click();
    fixture.detectChanges();
    const confirm = (
      Array.from(fixture.nativeElement.querySelectorAll('dialog button')) as HTMLButtonElement[]
    ).find((b) => b.textContent?.trim() === 'Delete')!;
    confirm.click();

    expect(employees.exists(USER)).toBe(false);
    expect(toast.show).toHaveBeenCalledWith('Deleted Andi Santoso', 'danger');
    expect(router.navigate).toHaveBeenCalledWith(['/employees'], {
      queryParamsHandling: 'preserve',
    });
  });

  it('does not remove anything when the dialog is cancelled', () => {
    const employees = TestBed.inject(EmployeeService);
    render(USER);

    button('Delete').click();
    fixture.detectChanges();
    (Array.from(fixture.nativeElement.querySelectorAll('dialog button')) as HTMLButtonElement[])
      .find((b) => b.textContent?.trim() === 'Cancel')!
      .click();

    expect(employees.exists(USER)).toBe(true);
  });
});
