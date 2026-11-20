import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { Shell } from './layout/shell/shell';
import { Login } from './features/login/login';

describe('app routes', () => {
  let harness: RouterTestingHarness;
  let router: Router;
  let auth: AuthService;

  const page = (selector: string) => harness.fixture.nativeElement.querySelector(selector);

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding())],
    });
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService);
    harness = await RouterTestingHarness.create();
  });

  it('redirects unauthenticated users to login', async () => {
    await harness.navigateByUrl('/employees');

    expect(router.url).toBe('/login');
    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(Login);
  });

  it('shows the employee list when authenticated', async () => {
    auth.login('admin', 'admin123');

    await harness.navigateByUrl('/employees');

    expect(router.url).toBe('/employees');
    expect(page('app-employee-list')).toBeTruthy();
  });

  it('shows the add-employee page', async () => {
    auth.login('admin', 'admin123');

    await harness.navigateByUrl('/employees/add');

    expect(page('app-add-employee')).toBeTruthy();
  });

  it('shows the edit page in edit mode', async () => {
    auth.login('admin', 'admin123');

    await harness.navigateByUrl('/employees/andi.santoso1/edit');

    expect(page('app-add-employee')).toBeTruthy();
    expect(page('h1').textContent).toContain('Edit employee');
  });

  it('shows the employee detail page', async () => {
    auth.login('admin', 'admin123');

    await harness.navigateByUrl('/employees/andi.santoso1');

    expect(page('app-employee-detail')).toBeTruthy();
  });

  it('redirects the root path to the list for authenticated users', async () => {
    auth.login('admin', 'admin123');

    await harness.navigateByUrl('/');

    expect(router.url).toBe('/employees');
  });

  it('renders the shell around authenticated pages', async () => {
    auth.login('admin', 'admin123');

    await harness.navigateByUrl('/employees');

    expect(harness.fixture.nativeElement.querySelector('app-shell')).toBeTruthy();
    expect(Shell).toBeTruthy();
  });

  it('sends signed-in users away from the login page', async () => {
    auth.login('admin', 'admin123');

    await harness.navigateByUrl('/login');

    expect(router.url).toBe('/employees');
  });

  it('redirects unknown paths to login for guests', async () => {
    await harness.navigateByUrl('/nope');

    expect(router.url).toBe('/login');
  });

  it('shows the not-found page for unknown paths when signed in', async () => {
    auth.login('admin', 'admin123');

    await harness.navigateByUrl('/nope/at/all');

    expect(router.url).toBe('/nope/at/all');
    expect(page('app-not-found')).toBeTruthy();
    expect(page('app-shell')).toBeTruthy();
    expect(page('h1').textContent).toContain('Page not found');
    expect(TestBed.inject(Title).getTitle()).toBe('Page not found | PeopleHub');
  });
});
