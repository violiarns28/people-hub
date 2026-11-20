import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/ui/theme.service';
import { Icon } from '../../shared/ui/icon/icon';

/** Account menu (ARIA menu button pattern). The popover opens upward from the trigger. */
@Component({
  selector: 'app-user-menu',
  imports: [Icon],
  templateUrl: './user-menu.html',
  styles: `
    .menu-item {
      transition:
        background-color 0.15s,
        transform 0.16s ease-out;
    }
    .menu-item:hover,
    .menu-item:focus-visible {
      transform: translateX(2px);
    }
    .menu-item > app-icon,
    .menu-item > .theme-swap {
      transition: transform 0.16s ease-out;
    }
    .menu-item:hover > app-icon,
    .menu-item:hover > .theme-swap {
      transform: scale(1.12);
    }
    .theme-swap {
      position: relative;
      display: inline-flex;
      width: 18px;
      height: 18px;
    }
    .theme-swap app-icon {
      position: absolute;
      inset: 0;
      transition:
        opacity 0.2s ease-out,
        transform 0.22s ease-out;
    }
    .theme-swap .t-sun {
      opacity: 0;
      transform: rotate(-90deg) scale(0.5);
    }
    .theme-swap.is-dark .t-sun {
      opacity: 1;
      transform: rotate(0) scale(1);
    }
    .theme-swap.is-dark .t-moon {
      opacity: 0;
      transform: rotate(90deg) scale(0.5);
    }
    @media (prefers-reduced-motion: reduce) {
      .menu-item,
      .menu-item > app-icon,
      .menu-item > .theme-swap,
      .theme-swap app-icon {
        transition: none;
      }
      .menu-item:hover,
      .menu-item:hover > app-icon,
      .menu-item:hover > .theme-swap {
        transform: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative block',
    '(document:click)': 'onDocumentClick($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class UserMenu {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');

  readonly signOut = output<void>();

  protected readonly open = signal(false);
  protected readonly username = computed(() => this.auth.username() ?? 'admin');
  protected readonly initial = computed(() => this.username().charAt(0).toUpperCase());
  protected readonly isDark = computed(() => this.theme.mode() === 'dark');

  protected onTriggerKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.show(event.key === 'ArrowUp' ? 'last' : 'first');
    }
  }

  protected toggle(): void {
    if (this.open()) {
      this.close(true);
    } else {
      this.show('first');
    }
  }

  protected onMenuKey(event: KeyboardEvent): void {
    const items = this.items();
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowDown':
        next = (index + 1) % items.length;
        break;
      case 'ArrowUp':
        next = (index - 1 + items.length) % items.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = items.length - 1;
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.close(true);
        return;
      case 'Tab':
        this.close(false);
        return;
    }
    if (next !== null) {
      event.preventDefault();
      items[next]?.focus();
    }
  }

  protected toggleTheme(): void {
    this.theme.toggle();
    this.close(true);
  }

  protected requestSignOut(): void {
    this.close(false);
    this.signOut.emit();
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close(false);
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (this.open() && next && !this.host.nativeElement.contains(next)) {
      this.close(false);
    }
  }

  private show(focus: 'first' | 'last'): void {
    this.open.set(true);
    afterNextRender(
      () => {
        const items = this.items();
        (focus === 'first' ? items[0] : items[items.length - 1])?.focus();
      },
      { injector: this.injector },
    );
  }

  private close(restoreFocus: boolean): void {
    this.open.set(false);
    if (restoreFocus) {
      this.trigger()?.nativeElement.focus();
    }
  }

  private items(): HTMLElement[] {
    return Array.from(
      this.menu()?.nativeElement.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
  }
}
