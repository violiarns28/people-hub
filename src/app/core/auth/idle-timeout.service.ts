import { Service, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../ui/toast.service';
import { AuthService } from './auth.service';

export const IDLE_LIMIT_MS = 15 * 60 * 1000;
export const IDLE_WARN_MS = 60 * 1000;
const ACTIVITY_THROTTLE_MS = 1000;
const TICK_MS = 1000;
const EVENTS = ['mousemove', 'keydown', 'pointerdown', 'touchstart'] as const;

/** Signs the user out after a period of inactivity, with a warning shortly before. */
@Service()
export class IdleTimeoutService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  private lastActivity = Date.now();
  private lastRecorded = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  private readonly remainingMs = signal(IDLE_LIMIT_MS);

  /** True during the final minute before auto sign-out. */
  private readonly active = signal(false);
  readonly warning = computed(() => this.active() && this.remainingMs() <= IDLE_WARN_MS);
  readonly secondsLeft = computed(() => Math.max(0, Math.ceil(this.remainingMs() / 1000)));

  private readonly onActivity = () => this.record();

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.active.set(true);
    this.lastActivity = Date.now();
    this.remainingMs.set(IDLE_LIMIT_MS);
    for (const name of EVENTS) {
      document.addEventListener(name, this.onActivity, { passive: true });
    }
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    this.active.set(false);
    for (const name of EVENTS) {
      document.removeEventListener(name, this.onActivity);
    }
    clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Explicit "stay signed in". Also resets the warning. */
  keepAlive(): void {
    this.lastActivity = Date.now();
    this.remainingMs.set(IDLE_LIMIT_MS);
  }

  private record(): void {
    const now = Date.now();
    // Activity during the warning must be confirmed explicitly via keepAlive().
    if (now - this.lastRecorded < ACTIVITY_THROTTLE_MS || this.warning()) {
      return;
    }
    this.lastRecorded = now;
    this.lastActivity = now;
    this.remainingMs.set(IDLE_LIMIT_MS);
  }

  private tick(): void {
    const remaining = IDLE_LIMIT_MS - (Date.now() - this.lastActivity);
    this.remainingMs.set(Math.max(0, remaining));
    if (remaining <= 0) {
      this.stop();
      this.auth.logout();
      this.toast.show('You were signed out after 15 minutes of inactivity.', 'warning');
      void this.router.navigate(['/login']);
    }
  }
}
