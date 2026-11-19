import type { Employee } from './employee.model';
import { filterEmployees, paginate, sortEmployees, totalPages } from './employee-query';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    username: 'jane.doe1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe1@peoplehub.dev',
    birthDate: '1990-01-01T09:00',
    basicSalary: 5_000_000,
    status: 'Permanent',
    group: 'Engineering',
    description: 'Test',
    ...overrides,
  };
}

describe('employee table utils', () => {
  const employees: Employee[] = [
    makeEmployee({
      username: 'a1',
      firstName: 'Alice',
      lastName: 'Anderson',
      email: 'alice@peoplehub.dev',
      group: 'Engineering',
      status: 'Permanent',
      basicSalary: 9_000_000,
    }),
    makeEmployee({
      username: 'b2',
      firstName: 'Bob',
      lastName: 'Brown',
      email: 'bob@peoplehub.dev',
      group: 'Sales',
      status: 'Contract',
      basicSalary: 6_000_000,
    }),
    makeEmployee({
      username: 'c3',
      firstName: 'Carla',
      lastName: 'Clark',
      email: 'carla@peoplehub.dev',
      group: 'Engineering',
      status: 'Contract',
      basicSalary: 7_500_000,
    }),
  ];

  it('returns everything when no filters are active', () => {
    expect(filterEmployees(employees, {})).toHaveLength(3);
  });

  it('combines query, group and status with AND semantics', () => {
    const result = filterEmployees(employees, {
      query: 'ali',
      group: 'Engineering',
      status: 'Permanent',
    });

    expect(result.map((employee) => employee.username)).toEqual(['a1']);
  });

  it('returns no rows when one AND condition fails', () => {
    const result = filterEmployees(employees, {
      query: 'alice',
      group: 'Sales',
    });

    expect(result).toHaveLength(0);
  });

  it('matches the query across name, username and email (case-insensitive)', () => {
    expect(filterEmployees(employees, { query: 'brown' })).toHaveLength(1);
    expect(filterEmployees(employees, { query: 'B2' })).toHaveLength(1);
    expect(filterEmployees(employees, { query: 'CARLA@' })).toHaveLength(1);
  });

  it('filters by group only and status only', () => {
    expect(filterEmployees(employees, { group: 'Engineering' })).toHaveLength(2);
    expect(filterEmployees(employees, { status: 'Contract' })).toHaveLength(2);
  });

  it('sorts numeric columns in both directions', () => {
    expect(sortEmployees(employees, 'basicSalary', 'asc').map((e) => e.username)).toEqual([
      'b2',
      'c3',
      'a1',
    ]);
    expect(sortEmployees(employees, 'basicSalary', 'desc').map((e) => e.username)).toEqual([
      'a1',
      'c3',
      'b2',
    ]);
  });

  it('sorts string columns in both directions', () => {
    expect(sortEmployees(employees, 'firstName', 'asc').map((e) => e.firstName)).toEqual([
      'Alice',
      'Bob',
      'Carla',
    ]);
    expect(sortEmployees(employees, 'firstName', 'desc').map((e) => e.firstName)).toEqual([
      'Carla',
      'Bob',
      'Alice',
    ]);
  });

  it('paginates and clamps out-of-range pages', () => {
    expect(paginate(employees, 1, 2).map((e) => e.username)).toEqual(['a1', 'b2']);
    expect(paginate(employees, 2, 2).map((e) => e.username)).toEqual(['c3']);
    expect(paginate(employees, 99, 2).map((e) => e.username)).toEqual(['c3']);
    expect(paginate(employees, 0, 2).map((e) => e.username)).toEqual(['a1', 'b2']);
  });

  it('treats a non-positive page size as one', () => {
    expect(paginate(employees, 1, 0)).toHaveLength(1);
    expect(paginate(employees, 1, -5)).toHaveLength(1);
  });

  it('handles an empty list', () => {
    expect(paginate([], 1, 10)).toEqual([]);
  });

  it('computes the total number of pages', () => {
    expect(totalPages(100, 10)).toBe(10);
    expect(totalPages(101, 10)).toBe(11);
    expect(totalPages(0, 10)).toBe(1);
  });

  it('treats a non-positive page size as one when counting pages', () => {
    expect(totalPages(10, 0)).toBe(10);
    expect(totalPages(10, -1)).toBe(10);
  });
});
