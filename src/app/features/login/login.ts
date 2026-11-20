import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Icon } from '../../shared/ui/icon/icon';
import { Illustration } from '../../shared/ui/illustration/illustration';

interface LoginModel {
  username: string;
  password: string;
}

/** Simulated network latency so the loading state is perceivable. */
export const SIGN_IN_DELAY_MS = 500;

@Component({
  selector: 'app-login',
  imports: [FormField, Icon, Illustration],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly model = signal<LoginModel>({ username: '', password: '' });
  protected readonly authError = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly capsLock = signal(false);

  private readonly now = signal(Date.now());
  private ticker: ReturnType<typeof setInterval> | undefined;

  /** Whole seconds left in the lockout, 0 when not locked. */
  protected readonly lockSeconds = computed(() =>
    Math.max(0, Math.ceil((this.auth.lockedUntil() - this.now()) / 1000)),
  );
  protected readonly locked = computed(() => this.lockSeconds() > 0);

  protected readonly loginForm = form(this.model, (path) => {
    required(path.username, { message: 'Username is required' });
    required(path.password, { message: 'Password is required' });
  });

  constructor() {
    effect(() => {
      if (this.auth.lockedUntil() > Date.now() && this.ticker === undefined) {
        this.now.set(Date.now());
        this.ticker = setInterval(() => this.onTick(), 250);
      }
    });
    this.destroyRef.onDestroy(() => this.stopTicker());
  }

  protected toggleShowPassword(): void {
    this.showPassword.update((value) => !value);
  }

  protected onPasswordKey(event: KeyboardEvent): void {
    this.capsLock.set(event.getModifierState?.('CapsLock') ?? false);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.loading() || this.locked()) {
      return;
    }
    this.authError.set(null);

    void submit(this.loginForm, {
      action: async () => {
        this.loading.set(true);
        try {
          await new Promise<void>((resolve) => setTimeout(resolve, SIGN_IN_DELAY_MS));
          const { username, password } = this.model();

          if (this.auth.login(username, password)) {
            await this.router.navigate(['/employees']);
          } else {
            this.now.set(Date.now());
            this.authError.set(this.auth.isLocked() ? null : 'Invalid username or password');
            this.model.update((value) => ({ ...value, password: '' }));
          }
        } finally {
          this.loading.set(false);
        }
      },
    });
  }

  private onTick(): void {
    this.now.set(Date.now());
    if (this.auth.lockedUntil() <= Date.now()) {
      this.stopTicker();
    }
  }

  private stopTicker(): void {
    clearInterval(this.ticker);
    this.ticker = undefined;
  }
}
