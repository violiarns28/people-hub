import type { Employee, EmployeeFilters, EmployeeSortKey, SortDirection } from './employee.model';

function matchesQuery(employee: Employee, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return true;
  }

  const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();

  return (
    employee.firstName.toLowerCase().includes(query) ||
    employee.lastName.toLowerCase().includes(query) ||
    fullName.includes(query) ||
    employee.username.toLowerCase().includes(query) ||
    employee.email.toLowerCase().includes(query)
  );
}

/**
 * Filters employees. Every active filter must match (AND semantics).
 * An empty/absent filter is treated as "any".
 */
export function filterEmployees(
  employees: readonly Employee[],
  filters: EmployeeFilters,
): Employee[] {
  const group = (filters.group ?? '').trim();
  const status = (filters.status ?? '').trim();
  const query = filters.query ?? '';

  return employees.filter(
    (employee) =>
      matchesQuery(employee, query) &&
      (!group || employee.group === group) &&
      (!status || employee.status === status),
  );
}

/** Returns a new array sorted by `key` in the requested direction. */
export function sortEmployees(
  employees: readonly Employee[],
  key: EmployeeSortKey,
  direction: SortDirection,
): Employee[] {
  const factor = direction === 'asc' ? 1 : -1;

  return [...employees].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return (aValue - bValue) * factor;
    }

    return String(aValue).localeCompare(String(bValue), 'id', { sensitivity: 'base' }) * factor;
  });
}

/** Returns a clamped page slice. */
export function paginate<T>(items: readonly T[], page: number, size: number): T[] {
  const safeSize = Math.max(1, Math.floor(size) || 1);
  const pages = Math.max(1, Math.ceil(items.length / safeSize));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const start = (safePage - 1) * safeSize;

  return items.slice(start, start + safeSize);
}

/** Total number of pages for `totalItems` at the given page size. */
export function totalPages(totalItems: number, size: number): number {
  return Math.max(1, Math.ceil(totalItems / (Math.max(1, Math.floor(size)) || 1)));
}
