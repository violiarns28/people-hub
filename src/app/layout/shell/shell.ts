import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { IdleTimeoutService } from '../../core/auth/idle-timeout.service';
import { ThemeService } from '../../core/ui/theme.service';
import { ToastService } from '../../core/ui/toast.service';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { UserMenu } from '../user-menu/user-menu';
import { Icon } from '../../shared/ui/icon/icon';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, ConfirmDialog, UserMenu],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly theme = inject(ThemeService);
  protected readonly idle = inject(IdleTimeoutService);

  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');
  private readonly drawer = viewChild<ElementRef<HTMLElement>>('drawer');

  protected readonly drawerOpen = signal(false);
  protected readonly signOutOpen = signal(false);
  /** Desktop sidebar state, remembered per browser. */
  protected readonly collapsed = signal(Shell.readCollapsed());

  protected readonly isDark = computed(() => this.theme.mode() === 'dark');
  protected readonly idleMessage = computed(
    () => `You will be signed out in ${this.idle.secondsLeft()} seconds because of inactivity.`,
  );

  constructor() {
    this.idle.start();
    inject(DestroyRef).onDestroy(() => this.idle.stop());
  }

  private static readonly COLLAPSE_KEY = 'peoplehub.sidebar.collapsed';

  private static readCollapsed(): boolean {
    try {
      return localStorage.getItem(Shell.COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  }

  protected toggleCollapsed(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    try {
      localStorage.setItem(Shell.COLLAPSE_KEY, next ? '1' : '0');
    } catch {
      // Storage unavailable: the choice just lasts for this visit.
    }
  }

  protected toggleTheme(): void {
    this.theme.toggle();
  }

  protected openDrawer(): void {
    this.drawerOpen.set(true);
    queueMicrotask(() => {
      this.drawer()?.nativeElement.querySelector<HTMLElement>('a, button')?.focus();
    });
  }

  protected closeDrawer(restoreFocus = false): void {
    if (!this.drawerOpen()) {
      return;
    }
    this.drawerOpen.set(false);
    if (restoreFocus) {
      this.menuButton()?.nativeElement.focus();
    }
  }

  protected onEscape(): void {
    this.closeDrawer(true);
  }

  protected askSignOut(): void {
    this.closeDrawer();
    this.signOutOpen.set(true);
  }

  protected signOut(): void {
    this.signOutOpen.set(false);
    this.idle.stop();
    this.auth.logout();
    this.toast.show('You have been signed out.', 'info');
    void this.router.navigate(['/login']);
  }

  protected stayAlive(): void {
    this.idle.keepAlive();
  }
}
