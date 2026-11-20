import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  EMPLOYEE_GROUPS,
  EMPLOYEE_STATUSES,
  type Employee,
  type EmployeeSortKey,
  type SortDirection,
} from '../../../core/employees/employee.model';
import { EmployeeService } from '../../../core/employees/employee.service';
import {
  filterEmployees,
  paginate,
  sortEmployees,
  totalPages,
} from '../../../core/employees/employee-query';
import { PrivacyService } from '../../../core/privacy/privacy.service';
import { ToastService } from '../../../core/ui/toast.service';
import { RupiahPipe } from '../../../shared/pipes/rupiah.pipe';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../shared/ui/icon/icon';
import { Illustration } from '../../../shared/ui/illustration/illustration';
import { MaskedValue } from '../../../shared/ui/masked-value/masked-value';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { Select, type SelectOption } from '../../../shared/ui/select/select';

/** Router input binding sets a missing query param to undefined, so normalise to a string. */
const textParam = (value: string | undefined): string => value ?? '';

const PAGE_SIZES = [5, 10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;
const FLASH_MS = 1300;

/**
 * Employee objects present the last time the list was shown. Add and edit create new objects,
 * so anything not in here when the list shows again was just added or changed.
 */
let seen: WeakSet<Employee> | null = null;

interface Column {
  key: EmployeeSortKey;
  label: string;
}

const COLUMNS: readonly Column[] = [
  { key: 'firstName', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'birthDate', label: 'Birth date' },
  { key: 'basicSalary', label: 'Basic salary' },
  { key: 'group', label: 'Group' },
  { key: 'status', label: 'Status' },
];

const GROUP_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'All groups' },
  ...EMPLOYEE_GROUPS.map((value) => ({ value, label: value })),
];
const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'All statuses' },
  ...EMPLOYEE_STATUSES.map((value) => ({ value, label: value })),
];
const SORT_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'Default order' },
  ...COLUMNS.map((c) => ({ value: c.key, label: c.label })),
];

@Component({
  selector: 'app-employee-list',
  imports: [
    RouterLink,
    DatePipe,
    RupiahPipe,
    ConfirmDialog,
    Icon,
    Illustration,
    MaskedValue,
    Pagination,
    Select,
  ],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class EmployeeList {
  private readonly employeeService = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly privacy = inject(PrivacyService);

  /** List state lives in URL query params so it survives navigation and refresh. */
  protected readonly query = input('', {
    // eslint-disable-next-line @angular-eslint/no-input-rename -- short URL param name
    alias: 'q',
    transform: textParam,
  });
  protected readonly group = input('', { transform: textParam });
  protected readonly status = input('', { transform: textParam });
  /** Empty means no explicit sort: the service order is kept. */
  protected readonly sort = input<EmployeeSortKey | '', string | undefined>('', {
    transform: (value) => textParam(value) as EmployeeSortKey | '',
  });
  protected readonly dir = input<SortDirection, string | undefined>('asc', {
    transform: (value) => (value === 'desc' ? 'desc' : 'asc'),
  });
  protected readonly page = input(1, { transform: numberAttribute });
  protected readonly size = input(DEFAULT_PAGE_SIZE, { transform: numberAttribute });

  protected readonly groups = EMPLOYEE_GROUPS;
  protected readonly statuses = EMPLOYEE_STATUSES;
  protected readonly groupOptions = GROUP_OPTIONS;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly pageSizes = PAGE_SIZES;
  protected readonly columns = COLUMNS;

  private readonly all = this.employeeService.employees;
  /** Local search text so the clear button reacts instantly while the URL update is debounced. */
  protected readonly searchText = linkedSignal(() => this.query());
  /** Employees added or edited since the list was last shown: their rows flash briefly. */
  protected readonly lastChanged = signal<ReadonlySet<Employee>>(new Set());
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const destroyRef = inject(DestroyRef);
    let flashTimer: ReturnType<typeof setTimeout> | undefined;
    destroyRef.onDestroy(() => {
      clearTimeout(this.searchTimer);
      clearTimeout(flashTimer);
    });

    const current = this.all();
    const previous = seen;
    const changed = previous === null ? [] : current.filter((e) => !previous.has(e));
    seen = new WeakSet(current);
    if (changed.length > 0 && changed.length <= 3) {
      this.lastChanged.set(new Set(changed));
      flashTimer = setTimeout(() => this.lastChanged.set(new Set()), FLASH_MS);
    }
  }

  private readonly filtered = computed(() =>
    filterEmployees(this.all(), {
      query: this.query(),
      group: this.group(),
      status: this.status(),
    }),
  );

  private readonly sorted = computed(() => {
    const key = this.sort();
    return key ? sortEmployees(this.filtered(), key, this.dir()) : this.filtered();
  });

  protected readonly totalAll = computed(() => this.all().length);
  protected readonly total = computed(() => this.sorted().length);
  protected readonly hasFilters = computed(
    () => this.query().trim() !== '' || this.group() !== '' || this.status() !== '',
  );
  protected readonly countText = computed(() =>
    this.total() === this.totalAll()
      ? `${this.total()} employees`
      : `${this.total()} of ${this.totalAll()} employees`,
  );

  protected readonly pageSize = computed(() => {
    const value = Number(this.size());
    return PAGE_SIZES.includes(value) ? value : DEFAULT_PAGE_SIZE;
  });

  protected readonly pages = computed(() => totalPages(this.total(), this.pageSize()));

  protected readonly currentPage = computed(() => {
    const value = Number(this.page());
    const safe = Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
    return Math.min(safe, this.pages());
  });

  protected readonly rows = computed(() =>
    paginate(this.sorted(), this.currentPage(), this.pageSize()),
  );

  protected ariaSort(key: EmployeeSortKey): 'ascending' | 'descending' | 'none' {
    if (!this.sort() || this.sort() !== key) return 'none';
    return this.dir() === 'asc' ? 'ascending' : 'descending';
  }

  protected initials(employee: Employee): string {
    return `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase();
  }

  protected fullName(employee: Employee): string {
    return `${employee.firstName} ${employee.lastName}`;
  }

  protected statusClass(status: Employee['status']): string {
    return `badge badge-${status.toLowerCase()}`;
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(
      () => this.updateParams({ q: value.trim() || null, page: null }),
      SEARCH_DEBOUNCE_MS,
    );
  }

  protected clearSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchText.set('');
    this.updateParams({ q: null, page: null });
  }

  protected onGroupChange(value: string): void {
    this.updateParams({ group: value || null, page: null });
  }

  protected onStatusChange(value: string): void {
    this.updateParams({ status: value || null, page: null });
  }

  protected onPageSizeChange(size: number): void {
    this.updateParams({ size, page: null });
  }

  protected onPageChange(page: number): void {
    this.updateParams({ page });
  }

  /** Header click cycles ascending, descending, then back to the default order. */
  protected onSort(key: EmployeeSortKey): void {
    if (this.sort() !== key) {
      this.updateParams({ sort: key, dir: 'asc', page: null });
    } else if (this.dir() === 'asc') {
      this.updateParams({ sort: key, dir: 'desc', page: null });
    } else {
      this.updateParams({ sort: null, dir: null, page: null });
    }
  }

  protected onSortSelect(value: string): void {
    if (value) {
      this.updateParams({ sort: value, dir: 'asc', page: null });
    } else {
      this.updateParams({ sort: null, dir: null, page: null });
    }
  }

  /** Mobile direction button: same three states as the column headers. */
  protected cycleSortDirection(): void {
    const key = this.sort();
    if (key) {
      this.onSort(key);
    }
  }

  protected clearAll(): void {
    clearTimeout(this.searchTimer);
    this.searchText.set('');
    this.updateParams({ q: null, group: null, status: null, page: null });
  }

  protected readonly deleteTarget = signal<Employee | null>(null);
  protected readonly confirmOpen = signal(false);
  protected readonly deleteMessage = computed(() => {
    const target = this.deleteTarget();
    return target ? `Delete ${this.fullName(target)}? This cannot be undone.` : '';
  });

  protected onEdit(employee: Employee): void {
    void this.router.navigate(['/employees', employee.username, 'edit'], {
      queryParamsHandling: 'preserve',
    });
  }

  protected onDelete(employee: Employee): void {
    this.deleteTarget.set(employee);
    this.confirmOpen.set(true);
  }

  protected confirmDelete(): void {
    const target = this.deleteTarget();
    this.deleteTarget.set(null);
    if (!target) return;
    this.employeeService.remove(target.username);
    this.toast.show(`Deleted ${this.fullName(target)}`, 'danger');
  }

  private updateParams(params: Record<string, string | number | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }
}
