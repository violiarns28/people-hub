import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let auth: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    auth = TestBed.inject(AuthService);
  });

  const runGuard = () => TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

  it('allows authenticated users', () => {
    auth.login('admin', 'admin123');

    expect(runGuard()).toBe(true);
  });

  it('redirects unauthenticated users to the login page', () => {
    const result = runGuard();

    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result)).toBe('/login');
  });
});
