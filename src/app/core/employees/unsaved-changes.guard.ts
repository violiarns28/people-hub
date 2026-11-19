import type { CanDeactivateFn } from '@angular/router';

/** Implemented by routed components that can hold unsaved edits. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
  /** Asks the user whether to discard changes. Resolves true to leave. */
  confirmLeave?(): Promise<boolean>;
}

/** Blocks leaving a page with unsaved changes until the user confirms. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) {
    return true;
  }
  if (component.confirmLeave) {
    return component.confirmLeave();
  }
  return globalThis.confirm('Discard unsaved changes?');
};
