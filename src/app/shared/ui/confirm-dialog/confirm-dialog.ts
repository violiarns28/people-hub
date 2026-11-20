import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';

let nextId = 0;

/** Modal confirmation built on the native dialog element (focus trap and Esc work out of the box). */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    dialog.confirm-panel[open] {
      animation: dialog-pop 0.2s var(--ease-out-quint) both;
    }
    dialog.confirm-panel[open]::backdrop {
      animation: dialog-fade 0.2s ease-out both;
    }
    .confirm-icon.is-danger {
      animation: dialog-shake 0.4s ease-out 0.2s 1 both;
    }
    @keyframes dialog-pop {
      from {
        opacity: 0;
        transform: scale(0.96);
      }
    }
    @keyframes dialog-fade {
      from {
        opacity: 0;
      }
    }
    @keyframes dialog-shake {
      20% {
        transform: rotate(-10deg);
      }
      40% {
        transform: rotate(8deg);
      }
      60% {
        transform: rotate(-6deg);
      }
      80% {
        transform: rotate(3deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      dialog.confirm-panel[open],
      dialog.confirm-panel[open]::backdrop,
      .confirm-icon.is-danger {
        animation: none;
      }
    }
  `,
  template: `
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -- backdrop click only; Esc handled natively -->
    <dialog
      #dialog
      class="confirm-panel border-line bg-surface text-ink m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border p-0 shadow-lg backdrop:bg-black/50"
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="messageId"
      (cancel)="onNativeCancel($event)"
      (click)="onDialogClick($event)"
    >
      <div class="p-6">
        <div class="flex items-start gap-4">
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-full"
            class="confirm-icon"
            [class]="
              tone() === 'danger' ? 'bg-bad-soft text-bad is-danger' : 'bg-brand-soft text-brand'
            "
          >
            <app-icon [name]="tone() === 'danger' ? 'alert' : 'info'" [size]="20" />
          </span>
          <div class="min-w-0">
            <h2 [id]="titleId" class="text-lg font-semibold">{{ title() }}</h2>
            <p [id]="messageId" class="text-ink-2 mt-1.5 text-sm">{{ message() }}</p>
          </div>
        </div>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="btn btn-secondary min-h-11" autofocus (click)="cancel()">
            {{ cancelLabel() }}
          </button>
          <button
            type="button"
            class="btn press min-h-11"
            [class]="tone() === 'danger' ? 'bg-bad text-surface hover:opacity-90' : 'btn-primary'"
            (click)="confirm()"
          >
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    </dialog>
  `,
})
export class ConfirmDialog {
  readonly open = model(false);
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  readonly tone = input<'default' | 'danger'>('default');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  private readonly uid = `confirm-dialog-${nextId++}`;
  protected readonly titleId = `${this.uid}-title`;
  protected readonly messageId = `${this.uid}-message`;

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.open()) {
        if (!el.open) {
          if (typeof el.showModal === 'function') {
            el.showModal();
          } else {
            el.setAttribute('open', '');
          }
        }
      } else if (el.open) {
        if (typeof el.close === 'function') {
          el.close();
        } else {
          el.removeAttribute('open');
        }
      }
    });
  }

  protected confirm(): void {
    this.open.set(false);
    this.confirmed.emit();
  }

  protected cancel(): void {
    this.open.set(false);
    this.cancelled.emit();
  }

  protected onNativeCancel(event: Event): void {
    event.preventDefault();
    this.cancel();
  }

  protected onDialogClick(event: MouseEvent): void {
    // Clicks on the backdrop target the dialog element itself.
    if (event.target === this.dialog().nativeElement) {
      this.cancel();
    }
  }
}
