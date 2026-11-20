import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { maskEmail, maskLike } from '../../../core/privacy/mask';
import { PrivacyService, SensitiveField } from '../../../core/privacy/privacy.service';
import { Icon } from '../icon/icon';

const FIELD_LABEL: Record<SensitiveField, string> = {
  email: 'email',
  basicSalary: 'salary',
  birthDate: 'birth date',
};

/**
 * Shows a masked value with an eye toggle. The real text is only rendered while revealed.
 * The eye sits first in a fixed 28px box. Mask and value are monospace, nowrap and have the
 * same character count, so they have the same width: no fixed box, no clipping, no shift.
 */
@Component({
  selector: 'app-masked-value',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex max-w-full items-center gap-1' },
  styles: `
    .swap {
      animation: mv-fade 120ms ease-out;
    }
    @keyframes mv-fade {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    .reveal {
      animation:
        mv-fade 120ms ease-out,
        mv-flash 600ms ease-out;
    }
    @keyframes mv-flash {
      from {
        background-color: var(--c-brand-soft);
      }
      to {
        background-color: transparent;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .swap,
      .reveal {
        animation: none;
      }
    }
  `,
  template: `
    <button
      type="button"
      class="btn-icon text-ink-2 hover:bg-surface-2 hover:text-ink relative size-7 shrink-0 after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
      [attr.aria-pressed]="revealed()"
      [attr.aria-label]="ariaLabel()"
      (click)="privacy.toggle(subject(), field())"
    >
      <span class="relative inline-flex size-4.5 items-center justify-center">
        <span
          class="absolute inset-0 transition-opacity duration-150"
          [class.opacity-0]="revealed()"
        >
          <app-icon name="eye" />
        </span>
        <span
          class="absolute inset-0 transition-opacity duration-150"
          [class.opacity-0]="!revealed()"
        >
          <app-icon name="eye-off" />
        </span>
      </span>
    </button>
    @if (revealed()) {
      <span
        class="swap reveal num inline-block rounded-lg whitespace-nowrap"
        [attr.title]="value()"
        >{{ value() }}</span
      >
    } @else {
      <span class="swap num inline-block whitespace-nowrap">{{ text() }}</span>
    }
  `,
})
export class MaskedValue {
  protected readonly privacy = inject(PrivacyService);

  readonly subject = input.required<string>();
  readonly field = input.required<SensitiveField>();
  readonly value = input.required<string>();
  /** Unused now. Mask and value size to their own text. Kept so existing templates still compile. */
  readonly size = input<'compact' | 'full'>('compact');
  /** Overrides the field word in the aria-labels ("Show <label>" / "Hide <label>"). */
  readonly label = input<string>();

  protected readonly revealed = computed(() =>
    this.privacy.isRevealed(this.subject(), this.field()),
  );

  protected readonly text = computed(() =>
    this.field() === 'email' ? maskEmail(this.value()) : maskLike(this.value()),
  );

  protected readonly ariaLabel = computed(
    () => `${this.revealed() ? 'Hide' : 'Show'} ${this.label() ?? FIELD_LABEL[this.field()]}`,
  );
}
