import { Service, signal } from '@angular/core';
import { EMPLOYEE_GROUPS, EMPLOYEE_STATUSES, type Employee } from './employee.model';

const STORAGE_KEY = 'peoplehub.employees.v2';
const LEGACY_KEY = 'peoplehub.employees';
const SEED_COUNT = 100;

const FIRST_NAMES = [
  'Andi',
  'Budi',
  'Citra',
  'Dewi',
  'Eko',
  'Fitri',
  'Gilang',
  'Hana',
  'Indra',
  'Joko',
  'Kartika',
  'Lukman',
  'Maya',
  'Nanda',
  'Oscar',
  'Putri',
  'Rizky',
  'Sari',
  'Taufik',
  'Wulan',
];

const LAST_NAMES = [
  'Santoso',
  'Wijaya',
  'Prasetyo',
  'Kusuma',
  'Hidayat',
  'Lestari',
  'Nugroho',
  'Maulana',
  'Saputra',
  'Handayani',
  'Setiawan',
  'Rahayu',
  'Firmansyah',
  'Anggraini',
  'Hartono',
  'Siregar',
  'Simanjuntak',
  'Gunawan',
  'Purnama',
  'Halim',
];

const DESCRIPTIONS = [
  'Reliable team player focused on delivery.',
  'Passionate about building great products.',
  'Detail-oriented and quality-driven.',
  'Collaborative and solutions-focused.',
  'Experienced professional with a growth mindset.',
  'Customer-centric and results-oriented.',
];

@Service()
export class EmployeeService {
  private readonly items = signal<Employee[]>(this.load());
  readonly employees = this.items.asReadonly();

  add(employee: Employee): Employee {
    this.items.update((list) => [employee, ...list]);
    this.persist();
    return employee;
  }

  update(username: string, patch: Partial<Omit<Employee, 'username'>>): Employee | undefined {
    const current = this.getByUsername(username);
    if (!current) {
      return undefined;
    }
    const next: Employee = { ...current, ...patch, username: current.username };
    this.items.update((list) => list.map((item) => (item === current ? next : item)));
    this.persist();
    return next;
  }

  remove(username: string): Employee | undefined {
    const current = this.getByUsername(username);
    if (!current) {
      return undefined;
    }
    this.items.update((list) => list.filter((item) => item !== current));
    this.persist();
    return current;
  }

  getByUsername(username: string): Employee | undefined {
    return this.items().find((employee) => employee.username === username);
  }

  /** Case-insensitive username lookup (surrounding whitespace ignored). */
  exists(username: string): boolean {
    const wanted = username.trim().toLowerCase();
    return this.items().some((employee) => employee.username.toLowerCase() === wanted);
  }

  private load(): Employee[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const legacy = raw ? null : localStorage.getItem(LEGACY_KEY);
      const source = raw ?? legacy;
      if (source) {
        const parsed = JSON.parse(source) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Migration: birth dates used to carry a time part; keep only yyyy-MM-dd.
          const migrated = (parsed as Employee[]).map((employee) => ({
            ...employee,
            birthDate: String(employee.birthDate ?? '').slice(0, 10),
          }));
          if (legacy) {
            this.persistTo(migrated);
          }
          return migrated;
        }
      }
    } catch {
      // Corrupt storage - fall through and re-seed.
    }

    const seeded = this.seed();
    this.persistTo(seeded);
    return seeded;
  }

  private persist(): void {
    this.persistTo(this.items());
  }

  private persistTo(employees: readonly Employee[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
    } catch {
      // Ignore quota/serialization issues; in-memory state is still valid.
    }
  }

  /** Builds 100 deterministic dummy records. */
  private seed(): Employee[] {
    const employees: Employee[] = [];

    for (let index = 0; index < SEED_COUNT; index++) {
      const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
      const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
      const suffix = index + 1;
      const year = 1965 + (index % 45);
      const month = String((index % 12) + 1).padStart(2, '0');
      const day = String((index % 27) + 1).padStart(2, '0');

      employees.push({
        username: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix}`,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix}@peoplehub.dev`,
        birthDate: `${year}-${month}-${day}`,
        basicSalary: 4_000_000 + ((index * 350_000) % 36_000_000),
        status: EMPLOYEE_STATUSES[index % EMPLOYEE_STATUSES.length],
        group: EMPLOYEE_GROUPS[index % EMPLOYEE_GROUPS.length],
        description: DESCRIPTIONS[index % DESCRIPTIONS.length],
      });
    }

    return employees;
  }
}
