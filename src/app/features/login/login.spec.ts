import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService, LOCKOUT_MS, MAX_FAILED_ATTEMPTS } from '../../core/auth/auth.service';
import { Login, SIGN_IN_DELAY_MS } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let component: Login;
  let router: Router;
  let auth: AuthService;

  beforeEach(async () => {
    sessionStorage.clear();
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([])],
    }).compileComponents();

    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  const el = () => fixture.nativeElement as HTMLElement;
  const submitButton = () => el().querySelector('button[type="submit"]') as HTMLButtonElement;

  function setCredentials(username: string, password: string): void {
    (component as any).model.set({ username, password });
    fixture.detectChanges();
  }

  async function submit(): Promise<void> {
    (component as any).onSubmit(new Event('submit'));
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(SIGN_IN_DELAY_MS + 10);
    fixture.detectChanges();
  }

  it('shows required errors when submitted empty', async () => {
    await submit();

    expect(router.navigate).not.toHaveBeenCalled();
    const errors = Array.from(el().querySelectorAll('.field-error')).map((e) =>
      e.textContent?.trim(),
    );
    expect(errors).toContain('Username is required');
    expect(errors).toContain('Password is required');
  });

  it('navigates to the employee list on success', async () => {
    setCredentials('admin', 'admin123');

    await submit();

    expect(auth.isAuthenticated()).toBe(true);
    expect(router.navigate).toHaveBeenCalledWith(['/employees']);
  });

  it('shows a generic error on invalid credentials', async () => {
    setCredentials('admin', 'wrong');

    await submit();

    expect(router.navigate).not.toHaveBeenCalled();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain(
      'Invalid username or password',
    );
  });

  it('shows a loading state while signing in', async () => {
    setCredentials('admin', 'admin123');

    (component as any).onSubmit(new Event('submit'));
    await vi.advanceTimersByTimeAsync(10);
    fixture.detectChanges();

    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toContain('Signing in');
    await vi.advanceTimersByTimeAsync(SIGN_IN_DELAY_MS);
  });

  it('toggles password visibility accessibly', () => {
    const toggle = el().querySelector('button[aria-pressed]') as HTMLButtonElement;
    const input = el().querySelector('#password') as HTMLInputElement;

    expect(input.type).toBe('password');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');

    toggle.click();
    fixture.detectChanges();

    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
  });

  it('warns when Caps Lock is on', () => {
    const input = el().querySelector('#password') as HTMLInputElement;
    const event = new KeyboardEvent('keydown', { key: 'a', modifierCapsLock: true });

    input.dispatchEvent(event);
    fixture.detectChanges();

    expect(el().textContent).toContain('Caps Lock is on');
  });

  it('locks after repeated failures with a live countdown, then unlocks', async () => {
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      setCredentials('admin', 'bad');
      await submit();
    }
    fixture.detectChanges();

    expect(submitButton().disabled).toBe(true);
    const seconds = () => Number(el().querySelector('[data-testid="lock-seconds"]')?.textContent);
    expect(seconds()).toBe(LOCKOUT_MS / 1000);

    await vi.advanceTimersByTimeAsync(10_000);
    fixture.detectChanges();
    expect(seconds()).toBeLessThan(21);

    await vi.advanceTimersByTimeAsync(LOCKOUT_MS);
    fixture.detectChanges();
    expect(submitButton().disabled).toBe(false);
    expect(el().querySelector('[data-testid="lock-seconds"]')).toBeNull();
  });

  it('shows three value props with shield, clock and users icons on the brand panel', () => {
    const items = el().querySelectorAll('.value-props li');
    expect(items.length).toBe(3);
    expect(el().querySelector('app-illustration.animated')).toBeTruthy();
    expect(el().querySelector('.accent-line')).toBeTruthy();
  });

  it('crossfades two eye icons and gives the submit button press feedback', () => {
    expect(el().querySelectorAll('.eye app-icon').length).toBe(2);
    expect(submitButton().classList).toContain('press');
  });

  it('uses the users icon logo and one plain demo credentials line', () => {
    expect(el().textContent).not.toContain('Private ledger');
    expect(el().querySelectorAll('.brand-mark app-icon').length).toBe(2);
    expect(el().textContent).toContain('Demo account');
  });
});
