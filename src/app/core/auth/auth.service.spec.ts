import { TestBed } from '@angular/core/testing';
import { LOCKOUT_MS, MAX_FAILED_ATTEMPTS, SESSION_TTL_MS, AuthService } from './auth.service';
import { PrivacyService } from '../privacy/privacy.service';

const SESSION_KEY = 'peoplehub.session';

describe('AuthService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  const create = () => TestBed.inject(AuthService);

  it('accepts the hardcoded credentials (case-insensitive username)', () => {
    const service = create();

    expect(service.login('ADMIN', 'admin123')).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.username()).toBe('admin');
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}').expiresAt).toBeGreaterThan(
      Date.now(),
    );
    expect(localStorage.length).toBe(0);
  });

  it('rejects a wrong password or username', () => {
    const service = create();

    expect(service.login('admin', 'nope')).toBe(false);
    expect(service.login('root', 'admin123')).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('restores a persisted session', () => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ username: 'admin', expiresAt: Date.now() + 60_000 }),
    );

    expect(create().isAuthenticated()).toBe(true);
  });

  it('ignores an expired or corrupt session', () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username: 'admin', expiresAt: 1 }));
    expect(create().isAuthenticated()).toBe(false);

    TestBed.resetTestingModule();
    sessionStorage.setItem(SESSION_KEY, 'garbage');
    expect(create().isAuthenticated()).toBe(false);
  });

  it('expires the session after the TTL', () => {
    vi.useFakeTimers();
    const service = create();
    service.login('admin', 'admin123');

    vi.advanceTimersByTime(SESSION_TTL_MS + 1000);

    expect(service.isAuthenticated()).toBe(false);
  });

  it('logs out, clears storage and re-masks private data', () => {
    const service = create();
    const clear = vi.spyOn(TestBed.inject(PrivacyService), 'clear');
    service.login('admin', 'admin123');

    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(clear).toHaveBeenCalled();
  });

  it('locks after repeated failures and unlocks after the lockout', () => {
    vi.useFakeTimers();
    const service = create();

    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      service.login('admin', 'bad');
    }

    expect(service.isLocked()).toBe(true);
    expect(service.login('admin', 'admin123')).toBe(false);

    vi.advanceTimersByTime(LOCKOUT_MS + 1);

    expect(service.isLocked()).toBe(false);
    expect(service.login('admin', 'admin123')).toBe(true);
  });
});
