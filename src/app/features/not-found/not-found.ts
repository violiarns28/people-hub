import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/ui/icon/icon';
import { Illustration } from '../../shared/ui/illustration/illustration';

/** Shown for any unknown route inside the signed-in shell. */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink, Icon, Illustration],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section class="mx-auto flex max-w-lg flex-col items-center py-10 text-center sm:py-16">
      <app-illustration name="notfound" [size]="280" [animated]="true" />
      <p class="text-brand mt-6 text-sm font-semibold">Error 404</p>
      <h1 class="mt-2 text-3xl font-semibold">Page not found</h1>
      <p class="text-ink-2 mt-3 text-base">
        We could not find that page. Check the address, or head back to the employee list.
      </p>
      <a routerLink="/employees" class="btn btn-primary nudge-l press mt-8 min-h-11 px-5">
        <app-icon name="arrow-left" [size]="18" />
        Back to employees
      </a>
    </section>
  `,
})
export class NotFound {}
