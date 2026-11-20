import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { unsavedChangesGuard, type HasUnsavedChanges } from './unsaved-changes.guard';

function run(component: HasUnsavedChanges) {
  return unsavedChangesGuard(
    component,
    {} as ActivatedRouteSnapshot,
    {} as RouterStateSnapshot,
    {} as RouterStateSnapshot,
  );
}

describe('unsavedChangesGuard', () => {
  it('allows leaving when nothing changed', () => {
    const confirmLeave = vi.fn();

    expect(run({ hasUnsavedChanges: () => false, confirmLeave })).toBe(true);
    expect(confirmLeave).not.toHaveBeenCalled();
  });

  it('asks the component when there are unsaved changes', async () => {
    const confirmLeave = vi.fn().mockResolvedValue(false);

    await expect(run({ hasUnsavedChanges: () => true, confirmLeave })).resolves.toBe(false);
    expect(confirmLeave).toHaveBeenCalledOnce();
  });

  it('allows leaving when the user confirms', async () => {
    const result = run({ hasUnsavedChanges: () => true, confirmLeave: async () => true });

    await expect(result).resolves.toBe(true);
  });

  it('falls back to the browser confirm without confirmLeave', () => {
    const spy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false);

    expect(run({ hasUnsavedChanges: () => true })).toBe(false);
    spy.mockRestore();
  });
});
