/** Groups available to assign an employee to (10 dummy groups). */
export const EMPLOYEE_GROUPS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Finance',
  'People & Culture',
  'Operations',
  'Legal',
  'Customer Support',
] as const;

export type EmployeeGroup = (typeof EMPLOYEE_GROUPS)[number];

/** Employment status values. */
export const EMPLOYEE_STATUSES = ['Permanent', 'Contract', 'Probation', 'Intern'] as const;

export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

/** A single employee record. `username` is the unique identifier. */
export interface Employee {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  /** ISO date string `yyyy-MM-dd`, e.g. `1990-05-15` (no time part). */
  birthDate: string;
  basicSalary: number;
  status: EmployeeStatus;
  group: EmployeeGroup;
  description: string;
}

/** Columns the employee table can be sorted by. */
export type EmployeeSortKey =
  | 'username'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'birthDate'
  | 'basicSalary'
  | 'status'
  | 'group';

export type SortDirection = 'asc' | 'desc';

/** Filters applied to the employee table (combined with AND). */
export interface EmployeeFilters {
  query?: string;
  group?: string;
  status?: string;
}
