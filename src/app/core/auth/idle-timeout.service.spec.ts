import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { IDLE_LIMIT_MS, IDLE_WARN_MS, IdleTimeoutService } from './idle-timeout.service';
import { ToastService } from '../ui/toast.service';

describe('IdleTimeoutService', () => {
  let idle: IdleTimeoutService;
  let auth: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    auth = TestBed.inject(AuthService);
    auth.login('admin', 'admin123');
    idle = TestBed.inject(IdleTimeoutService);
  });

  afterEach(() => {
    idle.stop();
    vi.useRealTimers();
  });

  it('warns one minute before sign-out', () => {
    idle.start();
    expect(idle.warning()).toBe(false);

    vi.advanceTimersByTime(IDLE_LIMIT_MS - IDLE_WARN_MS + 1000);

    expect(idle.warning()).toBe(true);
    expect(idle.secondsLeft()).toBeLessThanOrEqual(60);
  });

  it('resets the countdown on activity', () => {
    idle.start();
    vi.advanceTimersByTime(IDLE_LIMIT_MS - IDLE_WARN_MS - 5000);

    document.dispatchEvent(new Event('keydown'));
    vi.advanceTimersByTime(10_000);

    expect(idle.warning()).toBe(false);
  });

  it('keepAlive clears the warning', () => {
    idle.start();
    vi.advanceTimersByTime(IDLE_LIMIT_MS - IDLE_WARN_MS + 2000);
    expect(idle.warning()).toBe(true);

    idle.keepAlive();

    expect(idle.warning()).toBe(false);
  });

  it('signs out, toasts and navigates to login when time runs out', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const toast = vi.spyOn(TestBed.inject(ToastService), 'show');
    idle.start();

    vi.advanceTimersByTime(IDLE_LIMIT_MS + 1000);

    expect(auth.isAuthenticated()).toBe(false);
    expect(toast).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('stops listening after stop()', () => {
    idle.start();
    idle.stop();

    vi.advanceTimersByTime(IDLE_LIMIT_MS * 2);

    expect(auth.isAuthenticated()).toBe(true);
  });
});
