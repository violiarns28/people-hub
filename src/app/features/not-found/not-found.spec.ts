import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotFound } from './not-found';

describe('NotFound', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(NotFound);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows a heading, plain text and the not-found illustration', () => {
    const el = setup();
    expect(el.querySelector('h1')?.textContent).toContain('Page not found');
    expect(el.querySelector('p.text-ink-2')?.textContent).toContain('could not find that page');
    expect(el.querySelector('app-illustration.animated')).toBeTruthy();
  });

  it('links back to the employee list', () => {
    const link = setup().querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/employees');
    expect(link.textContent).toContain('Back to employees');
  });
});
