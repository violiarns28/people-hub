import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  type ElementRef,
} from '@angular/core';
import {
  email,
  form,
  FormField,
  maxLength,
  readonly,
  required,
  submit,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import {
  EMPLOYEE_GROUPS,
  EMPLOYEE_STATUSES,
  type Employee,
  type EmployeeGroup,
  type EmployeeStatus,
} from '../../../core/employees/employee.model';
import { EmployeeService } from '../../../core/employees/employee.service';
import type { HasUnsavedChanges } from '../../../core/employees/unsaved-changes.guard';
import { ToastService } from '../../../core/ui/toast.service';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { CurrencyInput } from '../../../shared/ui/currency-input/currency-input';
import { DatePicker } from '../../../shared/ui/date-picker/date-picker';
import { Select, type SelectOption } from '../../../shared/ui/select/select';
import { Icon, type IconName } from '../../../shared/ui/icon/icon';
import { Illustration } from '../../../shared/ui/illustration/illustration';

interface EmployeeFormModel {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  basicSalary: number;
  status: EmployeeStatus | '';
  group: EmployeeGroup | '';
  description: string;
}

const EMPTY_MODEL: EmployeeFormModel = {
  username: '',
  firstName: '',
  lastName: '',
  email: '',
  birthDate: '',
  basicSalary: 0,
  status: '',
  group: '',
  description: '',
};

/** Simulated network latency so the save button can show its loading state. */
export const SAVE_DELAY_MS = 450;
/** How long the success check shows before navigating away. */
export const SUCCESS_DELAY_MS = 300;
export const DESCRIPTION_MAX = 280;
const DESCRIPTION_WARN_AT = 252;

/** Field keys in DOM order, mapped to the id of the control that should receive focus. */
const FIELD_IDS: readonly (readonly [keyof EmployeeFormModel, string])[] = [
  ['username', 'username'],
  ['email', 'email'],
  ['firstName', 'firstName'],
  ['lastName', 'lastName'],
  ['birthDate', 'birthDate'],
  ['status', 'status'],
  ['group', 'group'],
  ['basicSalary', 'basicSalary'],
  ['description', 'description'],
];

const FIELD_LABELS: Record<keyof EmployeeFormModel, string> = {
  username: 'Username',
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  birthDate: 'Birth date',
  basicSalary: 'Basic salary (IDR)',
  status: 'Status',
  group: 'Group',
  description: 'Description',
};

type SectionId = 'identity' | 'employment' | 'compensation' | 'notes';

const SECTIONS: readonly {
  id: SectionId;
  title: string;
  icon: IconName;
  fields: readonly (keyof EmployeeFormModel)[];
}[] = [
  {
    id: 'identity',
    title: 'Identity',
    icon: 'id-card',
    fields: ['username', 'email', 'firstName', 'lastName', 'birthDate'],
  },
  { id: 'employment', title: 'Employment', icon: 'briefcase', fields: ['status', 'group'] },
  { id: 'compensation', title: 'Compensation', icon: 'coins', fields: ['basicSalary'] },
  { id: 'notes', title: 'Notes', icon: 'file-text', fields: ['description'] },
];

interface SectionProgress {
  id: SectionId;
  title: string;
  done: number;
  total: number;
  complete: boolean;
  items: { id: string; label: string; ok: boolean }[];
}

/** Local calendar date as `yyyy-MM-dd`. */
function toDateInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toFormModel(employee: Employee): EmployeeFormModel {
  return {
    username: employee.username,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    birthDate: employee.birthDate.slice(0, 10),
    basicSalary: employee.basicSalary,
    status: employee.status,
    group: employee.group,
    description: employee.description,
  };
}

@Component({
  selector: 'app-add-employee',
  imports: [
    FormField,
    RouterLink,
    Select,
    CurrencyInput,
    DatePicker,
    ConfirmDialog,
    Icon,
    Illustration,
  ],
  templateUrl: './add-employee.html',
  styleUrl: './add-employee.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AddEmployee implements HasUnsavedChanges {
  private readonly employeeService = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  /** Bound from the `:username` route parameter; present only in edit mode. */
  readonly username = input<string | undefined>(undefined);

  protected readonly isEdit = computed(() => !!this.username());
  protected readonly target = computed(() => {
    const name = this.username();
    return name ? this.employeeService.getByUsername(name) : undefined;
  });
  protected readonly notFound = computed(() => this.isEdit() && !this.target());

  private readonly baseline = signal<EmployeeFormModel>({ ...EMPTY_MODEL });
  protected readonly model = signal<EmployeeFormModel>({ ...EMPTY_MODEL });
  protected readonly groups: SelectOption[] = EMPLOYEE_GROUPS.map((g) => ({ value: g, label: g }));
  protected readonly statuses: SelectOption[] = EMPLOYEE_STATUSES.map((s) => ({
    value: s,
    label: s,
  }));
  protected readonly maxBirthDate = toDateInput(new Date());
  protected readonly descriptionMax = DESCRIPTION_MAX;
  protected readonly descriptionWarnAt = DESCRIPTION_WARN_AT;

  protected readonly submitAttempted = signal(false);
  protected readonly saving = signal(false);
  protected readonly succeeded = signal(false);
  protected readonly barStuck = signal(false);
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  protected readonly shaking = signal(false);
  protected readonly leaveOpen = signal(false);

  private saved = false;
  private shakeTimer: ReturnType<typeof setTimeout> | undefined;
  private leaveResolver: ((leave: boolean) => void) | undefined;

  protected readonly employeeForm = form(this.model, (path) => {
    readonly(path.username, () => this.isEdit());
    required(path.username, { message: 'Username is required' });
    validate(path.username, ({ value }) =>
      !this.isEdit() && value().trim() && this.employeeService.exists(value())
        ? { kind: 'usernameTaken', message: 'Username is already taken' }
        : null,
    );
    required(path.firstName, { message: 'First name is required' });
    required(path.lastName, { message: 'Last name is required' });
    required(path.email, { message: 'Email is required' });
    email(path.email, { message: 'Enter a valid email address' });
    required(path.birthDate, { message: 'Birth date is required' });
    validate(path.birthDate, ({ value }) => {
      const raw = value();
      if (!raw) {
        return null;
      }
      return raw.slice(0, 10) > toDateInput(new Date())
        ? { kind: 'futureDate', message: 'Birth date cannot be in the future' }
        : null;
    });
    validate(path.basicSalary, ({ value }) => {
      const amount = value();
      if (!Number.isFinite(amount) || amount < 1) {
        return { kind: 'salaryRequired', message: 'Basic salary must be greater than 0' };
      }
      return null;
    });
    required(path.status, { message: 'Status is required' });
    required(path.group, { message: 'Group is required' });
    required(path.description, { message: 'Description is required' });
    maxLength(path.description, DESCRIPTION_MAX, {
      message: `Description must be ${DESCRIPTION_MAX} characters or fewer`,
    });
  });

  protected readonly descriptionLength = computed(() => this.model().description.length);

  /** Live per-section completion, driven by each field's validity. */
  protected readonly sectionList = computed<SectionProgress[]>(() =>
    SECTIONS.map((s) => {
      const items = s.fields.map((key) => ({
        id: FIELD_IDS.find(([k]) => k === key)![1],
        label: FIELD_LABELS[key],
        ok: this.employeeForm[key]().valid(),
      }));
      const done = items.filter((i) => i.ok).length;
      return {
        id: s.id,
        title: s.title,
        done,
        total: items.length,
        complete: done === items.length,
        items,
      };
    }),
  );
  protected readonly sec = computed(
    () =>
      Object.fromEntries(this.sectionList().map((s) => [s.id, s])) as Record<
        SectionId,
        SectionProgress
      >,
  );
  protected readonly total = computed(() => {
    const list = this.sectionList();
    return {
      done: list.reduce((n, s) => n + s.done, 0),
      total: list.reduce((n, s) => n + s.total, 0),
    };
  });

  protected readonly isDirty = computed(() => {
    const current = this.model();
    const base = this.baseline();
    return (Object.keys(EMPTY_MODEL) as (keyof EmployeeFormModel)[]).some(
      (key) => current[key] !== base[key],
    );
  });

  /** One entry per invalid field, in DOM order, for the summary region. */
  protected readonly issues = computed(() =>
    FIELD_IDS.flatMap(([key, id]) => {
      const message = this.employeeForm[key]().errors()[0]?.message;
      return message ? [{ id, label: FIELD_LABELS[key], message }] : [];
    }),
  );

  constructor() {
    // Show a subtle shadow on the action bar only while it floats over more content.
    effect((onCleanup) => {
      const node = this.sentinel()?.nativeElement;
      if (!node || typeof IntersectionObserver === 'undefined') {
        return;
      }
      const observer = new IntersectionObserver(
        ([entry]) => this.barStuck.set(!entry.isIntersecting),
        { rootMargin: '0px 0px -12px 0px' },
      );
      observer.observe(node);
      onCleanup(() => observer.disconnect());
    });

    effect(() => {
      const found = this.target();
      untracked(() => {
        if (found) {
          const loaded = toFormModel(found);
          this.baseline.set(loaded);
          this.model.set({ ...loaded });
        }
      });
    });
  }

  hasUnsavedChanges(): boolean {
    return !this.saved && this.isDirty();
  }

  confirmLeave(): Promise<boolean> {
    this.leaveResolver?.(false);
    return new Promise<boolean>((resolve) => {
      this.leaveResolver = resolve;
      this.leaveOpen.set(true);
    });
  }

  protected onLeaveConfirmed(): void {
    this.settleLeave(true);
  }

  protected onLeaveCancelled(): void {
    this.settleLeave(false);
  }

  protected onLeaveOpenChange(open: boolean): void {
    this.leaveOpen.set(open);
    if (!open) {
      // Let a pending confirmed/cancelled event win before treating this as a dismissal.
      setTimeout(() => this.settleLeave(false));
    }
  }

  /** Message to display for a field, or null until it is touched or a submit was attempted. */
  protected errorOf(field: FieldTree<unknown>): string | null {
    const state = field();
    if (!state.touched() && !this.submitAttempted()) {
      return null;
    }
    return state.errors()[0]?.message ?? null;
  }

  /** True once a text field has been interacted with and is valid and non-empty. */
  protected isOk(field: FieldTree<string>): boolean {
    const state = field();
    return (
      (state.touched() || state.dirty()) &&
      state.valid() &&
      state.value().trim() !== '' &&
      !state.readonly()
    );
  }

  protected describedBy(field: FieldTree<unknown>, id: string): string | null {
    return this.errorOf(field) ? `${id}-error` : null;
  }

  protected shakeClass(field: FieldTree<unknown>): boolean {
    return this.shaking() && this.errorOf(field) !== null;
  }

  protected onBack(): void {
    void this.router.navigate(['/employees'], { queryParamsHandling: 'preserve' });
  }

  protected onCancel(): void {
    if (this.isEdit()) {
      this.onBack();
      return;
    }
    void this.router.navigate(['/employees']);
  }

  protected focusField(id: string, event?: Event): void {
    event?.preventDefault();
    document.getElementById(id)?.focus();
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.saving() || this.succeeded()) {
      return;
    }
    this.submitAttempted.set(true);

    void submit(this.employeeForm, {
      action: async () => {
        this.saving.set(true);
        try {
          await new Promise<void>((resolve) => setTimeout(resolve, SAVE_DELAY_MS));
          const value = this.model();
          const employee: Employee = {
            username: value.username.trim(),
            firstName: value.firstName.trim(),
            lastName: value.lastName.trim(),
            email: value.email.trim(),
            birthDate: value.birthDate,
            basicSalary: value.basicSalary,
            status: value.status as EmployeeStatus,
            group: value.group as EmployeeGroup,
            description: value.description.trim(),
          };

          if (this.isEdit()) {
            const patch: Partial<Employee> = { ...employee };
            delete patch.username;
            this.employeeService.update(this.username() as string, patch);
            this.saved = true;
            await this.showSuccess();
            this.toast.show(`Updated ${employee.firstName} ${employee.lastName}`, 'warning');
            await this.router.navigate(['/employees'], { queryParamsHandling: 'preserve' });
            return;
          }

          this.employeeService.add(employee);
          this.saved = true;
          await this.showSuccess();
          this.toast.show(`Employee ${employee.firstName} ${employee.lastName} added`, 'success');
          await this.router.navigate(['/employees']);
        } finally {
          this.saving.set(false);
        }
      },
      onInvalid: () => this.onInvalidSubmit(),
    });
  }

  /** Swap the spinner for a popping check, then give it a moment before navigating. */
  private async showSuccess(): Promise<void> {
    this.saving.set(false);
    this.succeeded.set(true);
    await new Promise<void>((resolve) => setTimeout(resolve, SUCCESS_DELAY_MS));
  }

  private onInvalidSubmit(): void {
    this.shaking.set(false);
    // Re-trigger the shake animation on the next frame.
    setTimeout(() => {
      this.shaking.set(true);
      clearTimeout(this.shakeTimer);
      this.shakeTimer = setTimeout(() => this.shaking.set(false), 500);
    });

    const first = this.issues()[0];
    if (first) {
      this.focusField(first.id);
    }
  }

  private settleLeave(leave: boolean): void {
    const resolve = this.leaveResolver;
    this.leaveResolver = undefined;
    this.leaveOpen.set(false);
    resolve?.(leave);
  }
}
