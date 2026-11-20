import { Service, inject, signal } from '@angular/core';
import { AuditLogService } from '../audit/audit-log.service';

/** Revealed values are hidden again after this long. */
export const AUTO_REMASK_MS = 30_000;

export type SensitiveField = 'email' | 'basicSalary' | 'birthDate';

/**
 * Tracks which sensitive values are currently visible.
 * Everything is masked by default, each reveal is audited and auto re-masks.
 */
@Service()
export class PrivacyService {
  private readonly audit = inject(AuditLogService);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  private readonly revealedKeys = signal<ReadonlySet<string>>(new Set());
  private readonly bulk = signal(false);

  /** True while the global "reveal all" switch is on. */
  readonly revealAll = this.bulk.asReadonly();

  /** Reactive: reads signals, so call it inside templates or computed(). */
  isRevealed(subject: string, field: SensitiveField): boolean {
    return this.bulk() || this.revealedKeys().has(this.key(subject, field));
  }

  toggle(subject: string, field: SensitiveField): void {
    const key = this.key(subject, field);

    if (this.revealedKeys().has(key)) {
      this.hide(key, subject, field);
      return;
    }

    this.revealedKeys.update((set) => new Set(set).add(key));
    this.audit.record('reveal', field, subject);
    this.timers.set(
      key,
      setTimeout(() => this.hide(key, subject, field), AUTO_REMASK_MS),
    );
  }

  toggleAll(): void {
    const next = !this.bulk();
    this.bulk.set(next);
    this.audit.record(next ? 'reveal' : 'hide', '*', '*');

    const existing = this.timers.get('*');
    if (existing) {
      clearTimeout(existing);
      this.timers.delete('*');
    }
    if (next) {
      this.timers.set(
        '*',
        setTimeout(() => this.toggleAll(), AUTO_REMASK_MS),
      );
    }
  }

  /** Re-masks everything immediately (logout, idle timeout). */
  clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.revealedKeys.set(new Set());
    this.bulk.set(false);
  }

  private hide(key: string, subject: string, field: SensitiveField): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    this.revealedKeys.update((set) => {
      const next = new Set(set);
      next.delete(key);
      return next;
    });
    this.audit.record('hide', field, subject);
  }

  private key(subject: string, field: SensitiveField): string {
    return `${subject}:${field}`;
  }
}
