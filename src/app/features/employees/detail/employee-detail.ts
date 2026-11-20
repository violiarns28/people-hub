import { formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuditLogService, type AuditEntry } from '../../../core/audit/audit-log.service';
import type { Employee } from '../../../core/employees/employee.model';
import { EmployeeService } from '../../../core/employees/employee.service';
import { PrivacyService } from '../../../core/privacy/privacy.service';
import { ToastService } from '../../../core/ui/toast.service';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { RupiahPipe } from '../../../shared/pipes/rupiah.pipe';
import { Icon } from '../../../shared/ui/icon/icon';
import { Illustration } from '../../../shared/ui/illustration/illustration';
import { MaskedValue } from '../../../shared/ui/masked-value/masked-value';

const FIELD_NAMES: Record<string, string> = {
  email: 'email',
  basicSalary: 'salary',
  birthDate: 'birth date',
};

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function relativeTime(iso: string, now: number): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) {
    return 'just now';
  }
  if (abs < 3600) {
    return RELATIVE.format(Math.round(seconds / 60), 'minute');
  }
  if (abs < 86_400) {
    return RELATIVE.format(Math.round(seconds / 3600), 'hour');
  }
  return RELATIVE.format(Math.round(seconds / 86_400), 'day');
}

function ageOf(iso: string, now: Date): number {
  const born = new Date(iso);
  let age = now.getFullYear() - born.getFullYear();
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) {
    age -= 1;
  }
  return Math.max(0, age);
}

@Component({
  selector: 'app-employee-detail',
  imports: [RouterLink, Icon, Illustration, MaskedValue, ConfirmDialog],
  templateUrl: './employee-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  styles: `
    .field {
      border-radius: 0.5rem;
      padding: 0.5rem 0.75rem;
      transition: background-color 150ms ease-out;
    }
    .field:hover {
      background-color: var(--c-surface-2);
    }
    .back-arrow,
    .ico,
    .swap-a,
    .swap-b {
      transition:
        transform 160ms ease-out,
        opacity 160ms ease-out;
    }
    .back:hover .back-arrow,
    .back:focus-visible .back-arrow {
      transform: translateX(-4px);
    }
    .act-edit:hover .ico,
    .act-edit:focus-visible .ico {
      transform: rotate(12deg);
    }
    .act-del:hover .ico,
    .act-del:focus-visible .ico {
      animation: wiggle 260ms ease-in-out;
    }
    @keyframes wiggle {
      25% {
        transform: rotate(-12deg);
      }
      75% {
        transform: rotate(10deg);
      }
    }
    .swap-b {
      opacity: 0;
      transform: scale(0.6);
    }
    .swap-b.shown {
      opacity: 1;
      transform: scale(1);
    }
    .swap-a.gone {
      opacity: 0;
      transform: scale(0.6);
    }
    .copy:disabled {
      opacity: 0.4;
      pointer-events: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .back-arrow,
      .ico,
      .swap-a,
      .swap-b {
        transition: none;
      }
      .back:hover .back-arrow,
      .back:focus-visible .back-arrow,
      .act-edit:hover .ico,
      .act-edit:focus-visible .ico {
        transform: none;
      }
      .act-del:hover .ico,
      .act-del:focus-visible .ico {
        animation: none;
      }
    }
  `,
})
export class EmployeeDetail {
  private readonly employeeService = inject(EmployeeService);
  private readonly audit = inject(AuditLogService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly privacy = inject(PrivacyService);
  private readonly rupiah = new RupiahPipe();

  /** Bound from the `:username` route parameter. */
  readonly username = input.required<string>();

  private readonly now = signal(Date.now());

  protected readonly employee = computed(() => this.employeeService.getByUsername(this.username()));

  protected readonly initials = computed(() => {
    const emp = this.employee();
    return emp ? `${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}`.toUpperCase() : '';
  });

  protected readonly birthText = computed(() => {
    const emp = this.employee();
    if (!emp) {
      return '';
    }
    return formatDate(emp.birthDate.slice(0, 10), 'dd MMMM yyyy', 'en-US');
  });

  /** Age is derived from the birth date; its own field shares the birth date reveal state. */
  protected readonly ageText = computed(() => {
    const emp = this.employee();
    if (!emp) {
      return '';
    }
    const years = ageOf(emp.birthDate.slice(0, 10), new Date(this.now()));
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  });

  protected readonly emailRevealed = computed(() => {
    const emp = this.employee();
    return !!emp && this.privacy.isRevealed(emp.username, 'email');
  });

  /** Which copy button just succeeded; reset after 1.5s. */
  protected readonly copied = signal<string | null>(null);
  private copyTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly deleteOpen = signal(false);

  protected readonly salaryText = computed(() =>
    this.rupiah.transform(this.employee()?.basicSalary),
  );

  protected readonly accessEntries = computed(() =>
    this.audit.forSubject(this.username()).map((entry: AuditEntry) => ({
      id: entry.id,
      label: `${entry.action === 'reveal' ? 'Revealed' : 'Hid'} ${FIELD_NAMES[entry.field] ?? entry.field}`,
      when: relativeTime(entry.at, this.now()),
      revealed: entry.action === 'reveal',
    })),
  );

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 30_000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      clearTimeout(this.copyTimer);
    });
  }

  protected async copy(key: string, text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    this.copied.set(key);
    clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => this.copied.set(null), 1500);
  }

  protected statusClass(status: Employee['status']): string {
    return `badge badge-${status.toLowerCase()}`;
  }

  protected onDeleteConfirmed(): void {
    const emp = this.employee();
    this.deleteOpen.set(false);
    if (!emp) {
      return;
    }
    this.employeeService.remove(emp.username);
    this.toast.show(`Deleted ${emp.firstName} ${emp.lastName}`, 'danger');
    void this.router.navigate(['/employees'], { queryParamsHandling: 'preserve' });
  }

  protected onOk(): void {
    // `preserve` keeps the list's search/filter/sort/page query params intact.
    void this.router.navigate(['/employees'], { queryParamsHandling: 'preserve' });
  }
}
