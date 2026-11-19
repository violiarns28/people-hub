import { Service, inject, signal } from '@angular/core';
import { PrivacyService } from '../privacy/privacy.service';

const SESSION_KEY = 'peoplehub.session';
const LOCKOUT_KEY = 'peoplehub.lockout';

/** Session lifetime. */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
/** Consecutive failures that trigger a lockout. */
export const MAX_FAILED_ATTEMPTS = 5;
/** How long the sign-in form stays locked. */
export const LOCKOUT_MS = 30_000;

/** Hardcoded demo credentials (this is a demo, there is no backend). */
const CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
} as const;

interface StoredSession {
  username: string;
  expiresAt: number;
}

interface StoredLockout {
  failed: number;
  lockedUntil: number;
}

@Service()
export class AuthService {
  private readonly privacy = inject(PrivacyService);

  private readonly session = signal<StoredSession | null>(this.readSession());
  private failedAttempts = this.readLockout().failed;
  private readonly locked = signal<number>(this.readLockout().lockedUntil);
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;

  readonly isAuthenticated = () => {
    const session = this.session();
    return session !== null && session.expiresAt > Date.now();
  };
  readonly username = () => this.session()?.username ?? null;

  /** Epoch ms until which sign-in is blocked (0 when not locked). */
  readonly lockedUntil = this.locked.asReadonly();

  constructor() {
    this.scheduleExpiry();
  }

  /** True while sign-in attempts are blocked. */
  isLocked(): boolean {
    return this.locked() > Date.now();
  }

  /** Validates against the hardcoded credentials and stores a session with an expiry. */
  login(username: string, password: string): boolean {
    if (this.isLocked()) {
      return false;
    }

    const isValid =
      username.trim().toLowerCase() === CREDENTIALS.username && password === CREDENTIALS.password;

    if (isValid) {
      const session: StoredSession = {
        username: CREDENTIALS.username,
        expiresAt: Date.now() + SESSION_TTL_MS,
      };
      this.failedAttempts = 0;
      this.locked.set(0);
      this.writeLockout();
      this.session.set(session);
      this.writeSession(session);
      this.scheduleExpiry();
      return true;
    }

    this.failedAttempts += 1;
    if (this.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      this.failedAttempts = 0;
      this.locked.set(Date.now() + LOCKOUT_MS);
    }
    this.writeLockout();
    return false;
  }

  logout(): void {
    clearTimeout(this.expiryTimer);
    this.session.set(null);
    this.writeSession(null);
    this.privacy.clear();
  }

  private scheduleExpiry(): void {
    clearTimeout(this.expiryTimer);
    const session = this.session();
    if (!session) {
      return;
    }
    const delay = Math.min(session.expiresAt - Date.now(), 2 ** 31 - 1);
    this.expiryTimer = setTimeout(() => this.logout(), Math.max(delay, 0));
  }

  private readSession(): StoredSession | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Partial<StoredSession>;
      if (
        typeof parsed.username === 'string' &&
        typeof parsed.expiresAt === 'number' &&
        parsed.expiresAt > Date.now()
      ) {
        return { username: parsed.username, expiresAt: parsed.expiresAt };
      }
    } catch {
      // corrupt or unavailable storage counts as signed out
    }
    return null;
  }

  private writeSession(session: StoredSession | null): void {
    try {
      if (session) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // Storage can be unavailable; the in-memory signal still works.
    }
  }

  private readLockout(): StoredLockout {
    try {
      const parsed = JSON.parse(
        sessionStorage.getItem(LOCKOUT_KEY) ?? '',
      ) as Partial<StoredLockout>;
      return {
        failed: typeof parsed.failed === 'number' ? parsed.failed : 0,
        lockedUntil:
          typeof parsed.lockedUntil === 'number' && parsed.lockedUntil > Date.now()
            ? parsed.lockedUntil
            : 0,
      };
    } catch {
      return { failed: 0, lockedUntil: 0 };
    }
  }

  private writeLockout(): void {
    try {
      const state: StoredLockout = { failed: this.failedAttempts, lockedUntil: this.locked() };
      sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }
}
