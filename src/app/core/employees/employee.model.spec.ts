import { EMPLOYEE_GROUPS, EMPLOYEE_STATUSES } from './employee.model';

describe('employee model', () => {
  it('defines ten employee groups', () => {
    expect(EMPLOYEE_GROUPS).toHaveLength(10);
    expect(EMPLOYEE_GROUPS).toContain('Engineering');
    expect(EMPLOYEE_GROUPS).toContain('Customer Support');
  });

  it('defines the four employment statuses', () => {
    expect(EMPLOYEE_STATUSES).toHaveLength(4);
    expect(EMPLOYEE_STATUSES).toEqual(['Permanent', 'Contract', 'Probation', 'Intern']);
  });
});
