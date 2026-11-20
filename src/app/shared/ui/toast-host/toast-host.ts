import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService, ToastVariant } from '../../../core/ui/toast.service';
import { Icon, IconName } from '../icon/icon';

const ICONS: Record<ToastVariant, IconName> = {
  info: 'info',
  success: 'check',
  warning: 'alert',
  danger: 'alert',
};

const TONES: Record<ToastVariant, string> = {
  info: 'bg-surface text-ink border-line shadow-[inset_4px_0_0_var(--c-brand),var(--shadow-pop)]',
  success:
    'bg-surface text-ink border-line shadow-[inset_4px_0_0_var(--c-brand),var(--shadow-pop)]',
  warning:
    'bg-warn-soft text-warn border-warn shadow-[inset_4px_0_0_var(--c-warn),var(--shadow-pop)]',
  danger: 'bg-bad-soft text-bad border-bad shadow-[inset_4px_0_0_var(--c-bad),var(--shadow-pop)]',
};

/** Renders the ToastService queue as a live region (centered with 16px gutters on mobile, top right on md+). */
@Component({
  selector: 'app-toast-host',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'pointer-events-none fixed top-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 md:right-4 md:left-auto md:w-96 md:max-w-none md:translate-x-0',
    'aria-live': 'polite',
    role: 'status',
  },
  template: `
    @for (toast of toastService.toasts(); track toast.id) {
      <div
        animate.enter="toast-enter"
        animate.leave="toast-leave"
        class="toast-row pointer-events-auto relative flex overflow-hidden w-full items-center gap-3 rounded-lg border py-3 pr-3.5 pl-[calc(0.875rem+4px)]"
        [class]="tone(toast.variant) + ' toast-' + toast.variant"
      >
        <span class="toast-icon flex size-5 shrink-0 items-center justify-center self-start">
          <app-icon [name]="icon(toast.variant)" [size]="20" />
        </span>
        <p class="min-w-0 flex-1 text-sm/5 font-medium">{{ toast.message }}</p>
        <button
          type="button"
          class="btn-icon toast-close relative -my-1.5 -mr-1.5 size-8 shrink-0 self-start opacity-70 after:absolute after:-inset-1.5 after:content-[''] hover:opacity-100"
          aria-label="Dismiss notification"
          (click)="toastService.dismiss(toast.id)"
        >
          <app-icon name="x" [size]="16" />
        </button>
        <span class="toast-progress absolute inset-x-0 bottom-0 h-0.5" aria-hidden="true"></span>
      </div>
    }
  `,
  styles: `
    .toast-progress {
      background: currentColor;
      opacity: 0.45;
      transform-origin: left center;
      animation: toast-countdown 3500ms linear forwards;
    }
    .toast-row:hover .toast-progress,
    .toast-row:focus-within .toast-progress {
      animation-play-state: paused;
    }
    @keyframes toast-countdown {
      from {
        transform: scaleX(1);
      }
      to {
        transform: scaleX(0);
      }
    }
    .toast-icon {
      animation: toast-icon-pop 0.32s var(--ease-out-quint) 0.08s both;
    }
    @keyframes toast-icon-pop {
      from {
        opacity: 0;
        transform: scale(0.4);
      }
      60% {
        transform: scale(1.15);
      }
    }
    .toast-close app-icon {
      transition: transform 0.18s ease-out;
    }
    .toast-close:hover app-icon {
      transform: rotate(90deg);
    }
    @media (prefers-reduced-motion: reduce) {
      .toast-progress {
        animation: none;
      }
      .toast-icon {
        animation: none;
      }
      .toast-close app-icon {
        transition: none;
      }
    }
  `,
})
export class ToastHost {
  protected readonly toastService = inject(ToastService);

  protected icon(variant: ToastVariant): IconName {
    return ICONS[variant];
  }

  protected tone(variant: ToastVariant): string {
    return TONES[variant];
  }
}
