import { Service, signal } from '@angular/core';

export type AuditAction = 'reveal' | 'hide';

export interface AuditEntry {
  readonly id: number;
  readonly action: AuditAction;
  /** Field that was revealed, e.g. `email`, `basicSalary`, `birthDate`, or `*` for bulk. */
  readonly field: string;
  /** Employee username the field belongs to, or `*` for bulk. */
  readonly subject: string;
  readonly at: string;
}

const MAX_ENTRIES = 200;

/** In-memory audit trail of PII reveals (a real system would ship these to the server). */
@Service()
export class AuditLogService {
  private nextId = 0;
  private readonly store = signal<readonly AuditEntry[]>([]);

  readonly entries = this.store.asReadonly();

  record(action: AuditAction, field: string, subject: string): void {
    const entry: AuditEntry = {
      id: this.nextId++,
      action,
      field,
      subject,
      at: new Date().toISOString(),
    };
    this.store.update((list) => [entry, ...list].slice(0, MAX_ENTRIES));
  }

  forSubject(subject: string): readonly AuditEntry[] {
    return this.store().filter((entry) => entry.subject === subject || entry.subject === '*');
  }
}
