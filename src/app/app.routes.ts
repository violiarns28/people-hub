import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { unsavedChangesGuard } from './core/employees/unsaved-changes.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in | PeopleHub',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: 'employees',
        title: 'Employees | PeopleHub',
        loadComponent: () =>
          import('./features/employees/list/employee-list').then((m) => m.EmployeeList),
      },
      {
        path: 'employees/add',
        title: 'Add employee | PeopleHub',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/employees/add/add-employee').then((m) => m.AddEmployee),
      },
      {
        path: 'employees/:username/edit',
        title: 'Edit employee | PeopleHub',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/employees/add/add-employee').then((m) => m.AddEmployee),
      },
      {
        path: 'employees/:username',
        title: 'Employee detail | PeopleHub',
        loadComponent: () =>
          import('./features/employees/detail/employee-detail').then((m) => m.EmployeeDetail),
      },
      { path: '', redirectTo: 'employees', pathMatch: 'full' },
      {
        path: '**',
        title: 'Page not found | PeopleHub',
        loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
