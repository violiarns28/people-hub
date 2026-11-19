import type { Employee } from './employee.model';
import { EmployeeService } from './employee.service';

const STORAGE_KEY = 'peoplehub.employees.v2';
const LEGACY_KEY = 'peoplehub.employees';

const NEW_EMPLOYEE: Employee = {
  username: 'new.person',
  firstName: 'New',
  lastName: 'Person',
  email: 'new.person@peoplehub.dev',
  birthDate: '1995-03-03',
  basicSalary: 8_000_000,
  status: 'Permanent',
  group: 'Engineering',
  description: 'Fresh hire',
};

describe('EmployeeService', () => {
  beforeEach(() => localStorage.clear());

  it('seeds 100 deterministic employees', () => {
    const first = new EmployeeService();
    expect(first.employees()).toHaveLength(100);
    const firstEmployee = first.employees()[0];

    localStorage.clear();
    const second = new EmployeeService();

    expect(second.employees()[0]).toEqual(firstEmployee);
  });

  it('restores employees from storage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([NEW_EMPLOYEE]));

    const service = new EmployeeService();

    expect(service.employees()).toHaveLength(1);
    expect(service.employees()[0].username).toBe('new.person');
  });

  it('falls back to seeding when storage is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');

    const service = new EmployeeService();

    expect(service.employees()).toHaveLength(100);
    expect(() => JSON.parse(localStorage.getItem(STORAGE_KEY) as string)).not.toThrow();
  });

  it('prepends a new employee and persists it', () => {
    const service = new EmployeeService();

    service.add(NEW_EMPLOYEE);

    expect(service.employees()).toHaveLength(101);
    expect(service.employees()[0].username).toBe('new.person');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('new.person');
  });

  it('finds employees by username', () => {
    const service = new EmployeeService();

    expect(service.getByUsername('andi.santoso1')?.firstName).toBe('Andi');
    expect(service.getByUsername('missing')).toBeUndefined();
  });

  it('checks username existence case-insensitively', () => {
    const service = new EmployeeService();

    expect(service.exists('andi.santoso1')).toBe(true);
    expect(service.exists('  ANDI.Santoso1 ')).toBe(true);
    expect(service.exists('nobody.here')).toBe(false);
  });

  it('updates an employee and persists, keeping the username', () => {
    const service = new EmployeeService();

    const next = service.update('andi.santoso1', { firstName: 'Changed', username: 'x' } as never);

    expect(next?.firstName).toBe('Changed');
    expect(next?.username).toBe('andi.santoso1');
    expect(service.getByUsername('andi.santoso1')?.firstName).toBe('Changed');
    expect(service.employees()).toHaveLength(100);
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Changed');
    expect(service.update('missing', { firstName: 'A' })).toBeUndefined();
  });

  it('removes an employee and persists', () => {
    const service = new EmployeeService();

    const removed = service.remove('andi.santoso1');

    expect(removed?.username).toBe('andi.santoso1');
    expect(service.exists('andi.santoso1')).toBe(false);
    expect(service.employees()).toHaveLength(99);
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain('andi.santoso1"');
    expect(service.remove('andi.santoso1')).toBeUndefined();
  });

  it('migrates legacy datetime birth dates without reseeding', () => {
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify([{ ...NEW_EMPLOYEE, birthDate: '1990-05-15T09:00' }]),
    );

    const service = new EmployeeService();

    expect(service.employees()).toHaveLength(1);
    expect(service.employees()[0].birthDate).toBe('1990-05-15');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('1990-05-15"');
  });

  it('seeds date-only birth dates', () => {
    const service = new EmployeeService();

    expect(service.employees().every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.birthDate))).toBe(true);
  });
});
